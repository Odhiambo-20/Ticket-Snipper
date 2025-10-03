// services/scheduler.ts
import * as TaskManager from 'expo-task-manager';
import { logger } from '../utils/logger';
import { executePurchaseTask } from './taskUtils';
import { NotificationService, NotificationType } from './notificationService';
import { monitorTickets } from './ticketMonitor';
import { BrowserAutomationService } from './browserAutomation';

// Conditional import - only for development builds
let Notifications: any = null;
let isExpoGo = false;

try {
  Notifications = require('expo-notifications');
  logger.info('expo-notifications loaded successfully');
} catch (e) {
  isExpoGo = true;
  logger.info('Running in Expo Go - notifications will use Alert fallback');
}

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
    const browserAutomation = new BrowserAutomationService();
    const isRunning = new Map<string, boolean>();

    await notificationService.setupChannel();
    await executePurchaseTask({ eventId, seatId, retryAttempts, retryDelayMs, paymentMethod }, Date.now(), {
      updateAutomationState: () => logger.info('Background state update skipped'),
      updateAutomationResult: () => logger.info('Background result update skipped'),
      notificationService,
      ticketMonitor: monitorTickets,
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

    // Check if Notifications is available
    if (!Notifications || isExpoGo) {
      logger.warn('Notifications not available - skipping scheduling (running in Expo Go)');
      logger.info('To enable notifications, create a development build with: npx expo prebuild && npx expo run:android');
      this.isInitialized = true;
      return;
    }

    try {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setUTCHours(24, 0, 0, 0); // Next midnight UTC
      const triggerTime = midnight.getTime() + this.timezoneOffset;
      const delaySeconds = Math.floor((triggerTime - Date.now()) / 1000);

      // Ensure we have a positive delay
      if (delaySeconds <= 0) {
        logger.warn('Trigger time is in the past, scheduling for next occurrence');
        midnight.setUTCHours(48, 0, 0, 0); // Add 24 hours
        const newTriggerTime = midnight.getTime() + this.timezoneOffset;
        const newDelaySeconds = Math.floor((newTriggerTime - Date.now()) / 1000);
        
        await Notifications.scheduleNotificationAsync({
          content: { 
            title: 'Ticket Snipe', 
            body: 'Monitoring Chinese ticket release at midnight', 
            priority: Notifications.AndroidNotificationPriority.HIGH 
          },
          trigger: { 
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: newDelaySeconds, 
            repeats: true 
          },
        });

        logger.info('Midnight task scheduled', { triggerTime: newTriggerTime, delaySeconds: newDelaySeconds });
      } else {
        await Notifications.scheduleNotificationAsync({
          content: { 
            title: 'Ticket Snipe', 
            body: 'Monitoring Chinese ticket release at midnight', 
            priority: Notifications.AndroidNotificationPriority.HIGH 
          },
          trigger: { 
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: delaySeconds, 
            repeats: true 
          },
        });

        logger.info('Midnight task scheduled', { triggerTime, delaySeconds });
      }

      // Schedule the actual task execution
      const timeoutDelay = Math.max(0, triggerTime - Date.now());
      setTimeout(async () => {
        try {
          const events = await monitorTickets.scanAvailableShows();
          if (events.length > 0 && events[0].available) {
            const selected = events[0];
            const automation = new BrowserAutomationService();
            // Extract numeric part from seat ID (e.g., "seat-1" -> 1)
            const seatIdString = selected.seats[0]?.id || 'seat-1';
            const seatIdNumber = parseInt(seatIdString.split('-')[1]) || 1;
            
            // Note: You'll need to update this call based on the actual signature of executePurchase
            // If it expects a payment handler function, replace 'credit_card' with the appropriate function
            await automation.executePurchase(selected.eventId, seatIdNumber, 'credit_card');
          }
        } catch (error) {
          logger.error('Midnight task failed', { error: error instanceof Error ? error.message : 'Unknown' });
        }
      }, timeoutDelay);

      this.isInitialized = true;
    } catch (error) {
      logger.error('Failed to schedule midnight task', { error: error instanceof Error ? error.message : 'Unknown' });
      // Don't throw - allow app to continue
      this.isInitialized = true; // Mark as initialized to prevent retries
    }
  }

  // Add method to check if running in Expo Go
  isRunningInExpoGo(): boolean {
    return isExpoGo;
  }

  // Reset initialization state (useful for testing)
  reset(): void {
    this.isInitialized = false;
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
  isRunningInExpoGo: () => getScheduler().isRunningInExpoGo(),
  reset: () => getScheduler().reset(),
};