// services/notificationService.ts
import { Platform, Alert } from 'react-native';
import { logger } from '../utils/logger';

// Check if we're running in Expo Go
const isExpoGo = !!(globalThis as any).expo?.modules?.ExpoGo;

// Conditionally import expo-notifications only if not in Expo Go
let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (error) {
    logger.warn('expo-notifications not available, using fallback');
  }
}

export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning',
}

export class NotificationService {
  private isAvailable: boolean = false;

  constructor() {
    this.isAvailable = Notifications !== null && !isExpoGo;
    if (!this.isAvailable) {
      logger.info('Running in Expo Go - notifications will use Alert fallback');
    }
  }

  private async requestPermissions(): Promise<void> {
    if (!this.isAvailable) return;

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        logger.warn('Notification permissions not granted');
      }
    } catch (error) {
      logger.error('Failed to request notification permissions', { error });
    }
  }

  async send(type: NotificationType, message: string, data?: Record<string, any>): Promise<void> {
    // Fallback to Alert if notifications not available (Expo Go)
    if (!this.isAvailable) {
      const title = `AutoTicket Grab - ${type.toUpperCase()}`;
      Alert.alert(title, message);
      logger.info('Alert shown (fallback)', { type, message });
      return;
    }

    await this.requestPermissions();

    const notificationContent = {
      title: `AutoTicket Grab - ${type.toUpperCase()}`,
      body: message,
      data,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      ...(Platform.OS === 'android' && {
        channelId: 'ticket-grab-channel',
        vibrate: [0, 250, 250, 250],
      }),
    };

    try {
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Immediate
      });
      logger.info('Notification sent', { type, message });
    } catch (error) {
      logger.error('Notification failed', { error, message });
      // Fallback to Alert if notification fails
      Alert.alert(`AutoTicket Grab - ${type.toUpperCase()}`, message);
    }
  }

  async setupChannel(): Promise<void> {
    if (!this.isAvailable) return;

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('ticket-grab-channel', {
          name: 'Ticket Grab Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      } catch (error) {
        logger.error('Failed to setup notification channel', { error });
      }
    }
  }
}

export const notify = new NotificationService();