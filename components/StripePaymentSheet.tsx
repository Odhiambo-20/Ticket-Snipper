// components/StripePaymentSheet.tsx
import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { automatePurchase } from '@/services/browserAutomation';
import { logger } from '@/utils/logger';

interface StripePaymentSheetProps {
  eventId: string;
  seatId: string;
  eventName?: string;
  seatNumber?: string;
  price?: number;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
}

export function StripePaymentSheet({ 
  eventId, 
  seatId, 
  eventName,
  seatNumber,
  price,
  onSuccess, 
  onError 
}: StripePaymentSheetProps) {
  const { confirmPayment } = useStripe();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Create a wrapper function for Stripe confirmation
      const stripeConfirmPayment = async (clientSecret: string) => {
        logger.info('Confirming Stripe payment', { clientSecret });
        
        const { error, paymentIntent } = await confirmPayment(clientSecret, {
          paymentMethodType: 'Card',
        });

        if (error) {
          logger.error('Stripe payment confirmation failed', { error: error.message });
          return { error };
        }

        if (paymentIntent) {
          logger.info('Stripe payment confirmed', { paymentIntentId: paymentIntent.id });
        }

        return { error: undefined };
      };

      // Execute the purchase with Stripe confirmation
      const result = await automatePurchase.executePurchase(
        eventId,
        seatId,
        'credit_card',
        stripeConfirmPayment
      );

      if (result.success && result.transactionId) {
        onSuccess(result.transactionId);
        Alert.alert('Success', 'Payment completed successfully!');
      } else {
        onError(result.message);
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Purchase failed', { error: errorMessage });
      onError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete Your Purchase</Text>
        </View>

        {/* Purchase Details */}
        <View style={styles.details}>
          {eventName && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Event:</Text>
              <Text style={styles.detailValue}>{eventName}</Text>
            </View>
          )}
          
          {seatNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Seat:</Text>
              <Text style={styles.detailValue}>{seatNumber}</Text>
            </View>
          )}
          
          {price !== undefined && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Price:</Text>
              <Text style={styles.priceValue}>${price.toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Payment Information */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            Your payment will be processed securely through Stripe
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isProcessing && styles.buttonDisabled]}
            onPress={handlePurchase}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Pay Now</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  details: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 20,
    color: '#2563eb',
    fontWeight: '700',
  },
  infoSection: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Export the hook for direct use in components
export function useStripePurchase() {
  const { confirmPayment } = useStripe();
  const [isProcessing, setIsProcessing] = useState(false);

  const executePurchase = async (
    eventId: string,
    seatId: string,
    onSuccess: (transactionId: string) => void,
    onError: (error: string) => void
  ) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const stripeConfirmPayment = async (clientSecret: string) => {
        const { error } = await confirmPayment(clientSecret, {
          paymentMethodType: 'Card',
        });
        return { error };
      };

      const result = await automatePurchase.executePurchase(
        eventId,
        seatId,
        'credit_card',
        stripeConfirmPayment
      );

      if (result.success && result.transactionId) {
        onSuccess(result.transactionId);
      } else {
        onError(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return { executePurchase, isProcessing };
}