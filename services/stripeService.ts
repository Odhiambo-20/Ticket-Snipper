// services/stripeService.ts
import { logger } from '../utils/logger';
import { NotificationService, NotificationType } from './notificationService';
import { ErrorHandler, ErrorType } from './errorHandler';

interface StripeCheckoutSession {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  message?: string;
}

interface PaymentVerification {
  success: boolean;
  status: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, string>;
  message?: string;
}

export class StripeService {
  private apiUrl: string = process.env.EXPO_PUBLIC_BACKEND_API_URL || 'https://ticket-snipper-backend.vercel.app';
  private apiKey: string = process.env.EXPO_PUBLIC_TICKET_API_KEY || '';
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  async createCheckoutSession(
    shows: { showId: string; quantity: number; price: number; title: string }[],
    userId: string
  ): Promise<StripeCheckoutSession> {
    return ErrorHandler.retryOperation(async () => {
      try {
        if (!shows.length || shows.some(show => show.quantity <= 0 || show.price <= 0)) {
          throw new Error('Invalid show data: Quantity and price must be positive');
        }

        const totalAmount = shows.reduce((sum, show) => sum + show.price * show.quantity, 0);
        const response = await fetch(`${this.apiUrl}/api/payments/stripe/create-checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
          body: JSON.stringify({
            shows,
            userId,
            totalAmount,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to create checkout session: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || 'Checkout session creation failed');
        }

        logger.payment('Stripe checkout session created', { sessionId: data.sessionId, totalAmount });
        await this.notificationService.send(NotificationType.INFO, 'Redirecting to Stripe for payment');
        return data;
      } catch (error) {
        const appError = ErrorHandler.handleError(error, 'createCheckoutSession');
        throw appError;
      }
    });
  }

  async verifyPayment(sessionId: string): Promise<PaymentVerification> {
    return ErrorHandler.retryOperation(async () => {
      try {
        const response = await fetch(`${this.apiUrl}/api/payments/stripe/session/${sessionId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (errorText.includes('expired')) {
            throw new Error('Session expired');
          }
          throw new Error(`Failed to verify payment: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || 'Payment verification failed');
        }

        logger.payment('Payment verification completed', { sessionId, status: data.status });
        return {
          success: data.status === 'complete',
          status: data.status,
          transactionId: data.sessionId,
          amount: data.amount,
          currency: data.currency,
          metadata: data.metadata,
          message: data.status === 'complete' ? 'Payment successful' : 'Payment incomplete',
        };
      } catch (error) {
        const appError = ErrorHandler.handleError(error, 'verifyPayment');
        throw appError;
      }
    });
  }
}

export const stripeService = new StripeService();