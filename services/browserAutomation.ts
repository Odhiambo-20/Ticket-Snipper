// services/browserAutomation.ts
import axios from 'axios';
import { logger } from '../utils/logger';
import { TicketMonitorService } from './ticketMonitor';
import { useStripe } from '@stripe/stripe-react-native';

// Interface for the expected response from the Stripe payment intent API
interface PaymentIntentResponse {
  client_secret: string;
  id: string;
}

export interface PurchaseResult {
  success: boolean;
  message: string;
  transactionId?: string;
}

export class BrowserAutomationService {
  private ticketMonitor: TicketMonitorService;
  private backendApiUrl: string = process.env.EXPO_PUBLIC_BACKEND_API_URL || 'http://10.0.2.2:3000';
  private apiKey: string = process.env.EXPO_PUBLIC_TICKET_API_KEY || '';

  constructor() {
    this.ticketMonitor = new TicketMonitorService();
  }

  async executePurchase(
    eventId: string,
    quantity: number,
    stripeConfirmPayment: (clientSecret: string) => Promise<{ error?: any }>,
  ): Promise<PurchaseResult> {
    logger.info('Starting purchase automation', { eventId, quantity });
    const startTime = Date.now();

    try {
      if (Date.now() - startTime > 15000) {
        throw new Error('Purchase exceeded 15-second limit');
      }

      const available = await this.ticketMonitor.checkAvailability(eventId);
      if (!available) throw new Error('Tickets unavailable');

      const amount = 100; // Placeholder; should be fetched dynamically
      const response = await axios.post<PaymentIntentResponse>(
        `${this.backendApiUrl}/api/payments/stripe/create-intent`,
        {
          amount: amount * quantity * 100, // Amount in cents
          currency: 'usd',
          eventId,
          seatId: `seat-${eventId}-${quantity}`, // Placeholder
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
        },
      );

      const { client_secret, id } = response.data;
      logger.info('Stripe payment intent created', { paymentIntentId: id });

      const { error } = await stripeConfirmPayment(client_secret);
      if (error) {
        throw new Error(`Payment confirmation failed: ${error.message || 'Unknown error'}`);
      }

      logger.info('Stripe payment confirmed', { transactionId: id });
      return {
        success: true,
        message: 'Payment processed',
        transactionId: id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Purchase automation failed', { error: errorMessage, eventId });
      return { success: false, message: errorMessage };
    }
  }
}

export const automatePurchase = new BrowserAutomationService();