// services/taskUtils.ts
import { NotificationService, NotificationType } from './notificationService';
import { BrowserAutomationService, PurchaseResult } from './browserAutomation';
import { TicketMonitorService } from './ticketMonitor';
import { logger } from '../utils/logger';

interface AutomationConfig {
  eventId: string;
  seatId: string;
  retryAttempts: number;
  retryDelayMs: number;
  paymentMethod: 'credit_card' | 'paypal';
}

interface TaskDependencies {
  updateAutomationState: (eventId: string, state: 'waiting' | 'running' | 'stopped') => void;
  updateAutomationResult: (eventId: string, result: { success: boolean; message: string; transactionId?: string }) => void;
  notificationService: NotificationService;
  ticketMonitor: TicketMonitorService;
  browserAutomation: BrowserAutomationService;
  isRunning: Map<string, boolean>;
}

export async function executePurchaseTask(
  config: AutomationConfig,
  triggerTime: number,
  deps: TaskDependencies
): Promise<void> {
  const { eventId, seatId, retryAttempts, retryDelayMs, paymentMethod } = config;
  const {
    updateAutomationState,
    updateAutomationResult,
    notificationService,
    ticketMonitor,
    browserAutomation,
    isRunning
  } = deps;

  if (isRunning.get(eventId)) return;

  isRunning.set(eventId, true);
  updateAutomationState(eventId, 'running');

  try {
    // Fixed: Only pass eventId to checkAvailability
    const isAvailable = await ticketMonitor.checkAvailability(eventId);
    
    if (!isAvailable) throw new Error('Seat unavailable');

    const result = await browserAutomation.executePurchase(eventId, seatId, paymentMethod);

    if (result.success) {
      await notificationService.send(
        NotificationType.SUCCESS,
        `Ticket secured for ${eventId}`
      );
      updateAutomationResult(eventId, result);
    } else {
      await handleRetry(config, deps);
    }
  } catch (error) {
    logger.error('Purchase execution failed', {
      error: error instanceof Error ? error.message : 'Unknown',
      eventId
    });
    await notificationService.send(
      NotificationType.ERROR,
      `Purchase failed: ${error instanceof Error ? error.message : 'Unknown'}`
    );
    await handleRetry(config, deps);
  } finally {
    isRunning.set(eventId, false);
    updateAutomationState(eventId, 'stopped');
  }
}

async function handleRetry(config: AutomationConfig, deps: TaskDependencies): Promise<void> {
  const { eventId, retryAttempts, retryDelayMs } = config;
  const { updateAutomationState, notificationService } = deps;

  if (retryAttempts > 0) {
    config.retryAttempts -= 1;
    await notificationService.send(
      NotificationType.INFO,
      `Retrying ${eventId} in ${retryDelayMs / 1000}s`
    );
    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    await executePurchaseTask(config, Date.now(), deps);
  } else {
    updateAutomationState(eventId, 'stopped');
    await notificationService.send(
      NotificationType.WARNING,
      `Max retries reached for ${eventId}`
    );
  }
}