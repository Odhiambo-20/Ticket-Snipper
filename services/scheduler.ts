// services/scheduler.ts
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { logger } from '../utils/logger';
import { executePurchaseTask } from './taskUtils';
import { NotificationService, NotificationType } from './notificationService';
import { getMonitorTickets } from './ticketMonitor';
import { BrowserAutomationService } from './browserAutomation';

const BACKGROUND_TASK = 'ticket-snipe-task';

TaskManager.defineTask(BACKGROUND_TASK, async ({ data, error }) => {
  if (error) {
    logger.error('Background task failed', { error: error.message });
    return;
  }

  const { eventId, seatId, paymentMethod, retryAttempts, retryDelayMs } = data as {
    eventId: string;
    seatId: string;
    paymentMethod: 'credit_card' | 'paypal';
    retryAttempts: number;
    retryDelayMs: number;
  };

  try {
    const notificationService = new NotificationService();
    const ticketMonitor = getMonitorTickets(); // Use lazy initialization
    const browserAutomation = new BrowserAutomationService();
    const isRunning = new Map<string, boolean>();

    await notificationService.setupChannel();
    await executePurchaseTask({ eventId, seatId, retryAttempts, retryDelayMs, paymentMethod }, Date.now(), {
      updateAutomationState: () => logger.info('Background state update skipped'),
      updateAutomationResult: () => logger.info('Background result update skipped'),
      notificationService,
      ticketMonitor,
      browserAutomation,
      isRunning,
    });
  } catch (error) {
    logger.error('Background task execution failed', { error: error instanceof Error ? error.message : 'Unknown', eventId });
    const notificationService = new NotificationService();
    await notificationService.send(NotificationType.ERROR, `Task failed for ${eventId}`);
  }
});

export class SchedulerService {
  private timezoneOffset: number = 8 * 60 * 60 * 1000; // China Standard Time (UTC+8)
  private isInitialized: boolean = false;

  async scheduleMidnightTask(): Promise<void> {
    // Prevent multiple initializations
    if (this.isInitialized) {
      logger.info('Scheduler already initialized, skipping');
      return;
    }

    try {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setUTCHours(24, 0, 0, 0); // Next midnight UTC
      const triggerTime = midnight.getTime() + this.timezoneOffset;

      await Notifications.scheduleNotificationAsync({
        content: { 
          title: 'Ticket Snipe', 
          body: 'Monitoring Chinese ticket release at midnight', 
          priority: Notifications.AndroidNotificationPriority.HIGH 
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.floor((triggerTime - Date.now()) / 1000), 
          repeats: true 
        },
      });

      setTimeout(async () => {
        try {
          const ticketMonitor = getMonitorTickets(); // Use lazy initialization
          const events = await ticketMonitor.scanAvailableShows();
          const selected = await ticketMonitor.selectOptimalTicket(events);
          if (selected) {
            const automation = new BrowserAutomationService();
            await automation.executePurchase(selected.eventId, selected.seatId, 'credit_card');
          }
        } catch (error) {
          logger.error('Midnight task failed', { error: error instanceof Error ? error.message : 'Unknown' });
        }
      }, Math.max(0, triggerTime - Date.now())); // Ensure non-negative timeout

      this.isInitialized = true;
      logger.info('Midnight task scheduled', { triggerTime });
    } catch (error) {
      logger.error('Failed to schedule midnight task', { error: error instanceof Error ? error.message : 'Unknown' });
      // Don't throw - allow app to continue
    }
  }
}

// Lazy initialization for scheduler too
let schedulerInstance: SchedulerService | null = null;

export const getScheduler = (): SchedulerService => {
  if (!schedulerInstance) {
    schedulerInstance = new SchedulerService();
  }
  return schedulerInstance;
};

// For backwards compatibility
export const scheduler = {
  get instance() {
    return getScheduler();
  },
  // Expose methods directly for convenience
  scheduleMidnightTask: () => getScheduler().scheduleMidnightTask(),
};