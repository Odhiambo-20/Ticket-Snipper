// services/notificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from '../utils/logger';

export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning',
}

export class NotificationService {
  private async requestPermissions(): Promise<void> {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      logger.warn('Notification permissions not granted');
    }
  }

  async send(type: NotificationType, message: string, data?: Record<string, any>): Promise<void> {
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
    }
  }

  async setupChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('ticket-grab-channel', {
        name: 'Ticket Grab Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  }
}

export const notify = new NotificationService();