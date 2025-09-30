import { NotificationService, NotificationType } from './notificationService';
import { TicketMonitorService } from './ticketMonitor';
import { logger } from '../utils/logger';
import { auth } from './firebaseConfig';

// Define a type for callbacks
type StoreCallback = (data: any) => void;

interface AutomationConfig {
  showId: string;
  quantity: number;
  userId?: string;
}

export class TicketAutomationService {
  private notificationService: NotificationService;
  private ticketMonitor: TicketMonitorService;
  private apiUrl = process.env.EXPO_PUBLIC_BACKEND_API_URL || 'http://10.0.2.2:3000';
  private apiKey = process.env.EXPO_PUBLIC_TICKET_API_KEY || '';
  private callbacks: StoreCallback[] = [];

  constructor() {
    this.notificationService = new NotificationService();
    this.ticketMonitor = new TicketMonitorService();
  }

  async initialize(): Promise<void> {
    const userId = auth.currentUser?.uid || 'anonymous';
    logger.info('TicketAutomationService initialized', { userId });
  }

  // Method to register callbacks
  setStoreCallbacks(callback: StoreCallback): void {
    this.callbacks.push(callback);
    logger.info('Callback registered', { callbackCount: this.callbacks.length });
  }

  // Method to trigger all registered callbacks
  private triggerCallbacks(data: any): void {
    this.callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('Callback execution failed', { error });
      }
    });
  }

  async schedulePurchase(config: AutomationConfig): Promise<void> {
    if (!config.showId || !config.quantity) {
      throw new Error('Show ID and quantity are required');
    }

    const userId = auth.currentUser?.uid || 'anonymous';
    const fullConfig: AutomationConfig = { ...config, userId };
    logger.info('Scheduling purchase', { showId: config.showId, quantity: config.quantity });

    try {
      await this.notificationService.send(
        NotificationType.INFO, 
        `Scheduling purchase for show ${config.showId}`
      );
      
      const available = await this.ticketMonitor.checkAvailability(config.showId);
      if (!available) {
        throw new Error('No tickets available for this show');
      }

      const response = await fetch(`${this.apiUrl}/api/shows/${config.showId}/reserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({ quantity: config.quantity }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to schedule purchase: ${errorText}`);
      }

      const data = await response.json();
      if (data.success && data.checkoutUrl) {
        await this.notificationService.send(
          NotificationType.SUCCESS, 
          `Purchase scheduled, redirecting to ${data.eventTitle}`
        );
        
        // Trigger callbacks with response data
        this.triggerCallbacks({ 
          showId: config.showId, 
          checkoutUrl: data.checkoutUrl, 
          eventTitle: data.eventTitle 
        });
      } else {
        throw new Error(data.message || 'Failed to schedule purchase');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Schedule purchase failed', { 
        error: errorMessage, 
        showId: config.showId 
      });
      await this.notificationService.send(
        NotificationType.ERROR, 
        `Failed to schedule: ${errorMessage}`
      );
      throw error;
    }
  }
}

// Create singleton instance
export const ticketAutomation = new TicketAutomationService();

// Export the setStoreCallbacks function for external use
export const setStoreCallbacks = (callback: StoreCallback): void => {
  ticketAutomation.setStoreCallbacks(callback);
};