// services/errorHandler.ts
import { NotificationType, notify } from './notificationService';
import { logger } from '../utils/logger';

export enum ErrorType {
  NETWORK = 'NETWORK',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  retryable: boolean;
}

export class ErrorHandler {
  static handleError(error: unknown, context: string): AppError {
    let appError: AppError;

    if (error instanceof Error) {
      if (error.message.includes('Network request failed') || error.message.includes('timeout')) {
        appError = {
          type: ErrorType.NETWORK,
          message: 'Network error. Please check your internet connection and try again.',
          code: 'NETWORK_FAILED',
          retryable: true,
        };
      } else if (error.message.includes('Session expired') || error.message.includes('Invalid session')) {
        appError = {
          type: ErrorType.SESSION_EXPIRED,
          message: 'Your payment session has expired. Please start a new checkout.',
          code: 'SESSION_EXPIRED',
          retryable: true,
        };
      } else if (error.message.includes('Invalid')) {
        appError = {
          type: ErrorType.VALIDATION,
          message: error.message,
          code: 'VALIDATION_ERROR',
          retryable: false,
        };
      } else if (error.message.includes('Failed to fetch') || error.message.includes('500')) {
        appError = {
          type: ErrorType.SERVER,
          message: 'Server error. Please try again later or contact support.',
          code: 'SERVER_ERROR',
          retryable: true,
        };
      } else {
        appError = {
          type: ErrorType.UNKNOWN,
          message: 'An unexpected error occurred. Please try again.',
          code: 'UNKNOWN_ERROR',
          retryable: true,
        };
      }
    } else {
      appError = {
        type: ErrorType.UNKNOWN,
        message: 'An unknown error occurred. Please try again.',
        code: 'UNKNOWN_ERROR',
        retryable: true,
      };
    }

    logger.error(`Error in ${context}`, {
      type: appError.type,
      message: appError.message,
      code: appError.code,
      originalError: error instanceof Error ? error.message : String(error),
    });

    notify.send(NotificationType.ERROR, appError.message);
    return appError;
  }

  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: AppError | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.handleError(error, `Retry attempt ${attempt}`);
        if (!lastError.retryable || attempt === maxRetries) {
          throw lastError;
        }
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        logger.info(`Retrying operation, attempt ${attempt + 1}`, { context: 'retry' });
      }
    }

    throw lastError || new Error('Retry operation failed');
  }
}