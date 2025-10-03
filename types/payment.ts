// types/payment.ts
export interface StripeCheckoutSession {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  message?: string;
}

export interface PaymentVerification {
  success: boolean;
  status: string;
  transactionId?: string;
  message?: string;
}

export interface PurchaseShow {
  showId: string;
  quantity: number;
  price: number;
  title: string;
}
