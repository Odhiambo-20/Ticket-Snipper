// app/(tabs)/dashboard.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Target, TrendingUp, Zap, CheckCircle, XCircle } from 'lucide-react-native';
import { useTicketStore } from '@/store/ticketStore';
import { router, useLocalSearchParams } from 'expo-router';
import { notify, NotificationType } from '@/services/notificationService';
import { stripeService } from '@/services/stripeService';
import { Linking } from 'react-native';
import { auth } from '@/services/firebaseConfig';
import { ErrorHandler, ErrorType } from '@/services/errorHandler';
import { logger } from '@/utils/logger';

export default function DashboardScreen() {
  const { shows, activeSnipes, activities, updateAutomationResult, incrementActiveSnipes } = useTicketStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const [selectedShowIds, setSelectedShowIds] = useState<string[]>([]);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    sessionId: string;
    amount: number | null;
    currency: string;
    showIds: string[];
  } | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedShows, setSelectedShows] = useState<
    { showId: string; quantity: number; price: number; title: string }[]
  >([]);

  // Handle payment verification on return from Stripe
  useEffect(() => {
    const verifyPayment = async () => {
      if (!session_id) return;

      setPaymentLoading(true);
      try {
        const result = await stripeService.verifyPayment(session_id);
        if (result.success) {
          setPaymentDetails({
            sessionId: session_id,
            amount: result.amount || null,
            currency: result.currency || 'usd',
            showIds: result.metadata?.showIds?.split(',') || [],
          });
          result.metadata?.showIds?.split(',').forEach(showId => {
            const show = shows.find(s => s.id === showId);
            if (show) {
              updateAutomationResult(showId, {
                success: true,
                message: `Payment completed for ${show.title}`,
                transactionId: session_id,
              });
            }
          });
          setPaymentSuccess(true);
          setPaymentModalVisible(true);
          notify.send(NotificationType.SUCCESS, 'Payment completed successfully');
          logger.payment('Payment verified successfully', { sessionId: session_id, status: result.status });
        } else {
          setPaymentError(result.message || 'Payment verification failed');
          setPaymentSuccess(false);
          setPaymentModalVisible(true);
          notify.send(NotificationType.ERROR, result.message || 'Payment verification failed');
          logger.error('Payment verification failed', { sessionId: session_id, message: result.message });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to verify payment';
        setPaymentError(errorMessage);
        setPaymentSuccess(false);
        setPaymentModalVisible(true);
        notify.send(NotificationType.ERROR, errorMessage);
        logger.error('Payment verification error', { sessionId: session_id, error: errorMessage });
      } finally {
        setPaymentLoading(false);
      }
    };

    verifyPayment();
  }, [session_id, shows, updateAutomationResult]);

  // Update selected shows and total amount
  useEffect(() => {
    if (selectedShowIds.length > 0) {
      const selected = shows
        .filter(show => selectedShowIds.includes(show.id) && show.isActive)
        .map(show => ({
          showId: show.id,
          quantity: show.preferences.quantity,
          price: show.preferences.maxPrice,
          title: show.title,
        }));
      const total = selected.reduce((sum, show) => sum + show.price * show.quantity, 0);
      setSelectedShows(selected);
      setTotalAmount(total);
    } else {
      setSelectedShows([]);
      setTotalAmount(0);
    }
  }, [selectedShowIds, shows]);

  // Notify on new activities
  useEffect(() => {
    if (activities.length > 0) {
      const latestActivity = activities[0];
      notify.send(
        latestActivity.status === 'success'
          ? NotificationType.SUCCESS
          : latestActivity.status === 'failed'
          ? NotificationType.ERROR
          : NotificationType.INFO,
        `${latestActivity.action} for ${latestActivity.show}`,
        { activityId: latestActivity.id }
      );
    }
  }, [activities]);

  const stats = [
    { id: 'active-shows', label: 'Active Shows', value: shows.length, icon: Target, color: '#00D4FF' },
    {
      id: 'successful-snipes',
      label: 'Successful Snipes',
      value: activities.filter(a => a.status === 'success').length,
      icon: TrendingUp,
      color: '#00FF88',
    },
    { id: 'running-snipes', label: 'Running Snipes', value: activeSnipes, icon: Zap, color: '#FF6B00' },
    {
      id: 'next-snipe',
      label: 'Next Snipe',
      value: shows.find(s => s.isActive)?.saleTime || 'N/A',
      icon: Clock,
      color: '#FF3B82',
    },
  ];

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const handleActivityPress = (showId: string, status: string) => {
    if (status === 'added' || status === 'viewed') {
      setSelectedShowIds(prev =>
        prev.includes(showId) ? prev.filter(id => id !== showId) : [...prev, showId]
      );
    }
  };

  const handleQuickSnipeSetup = () => {
    if (selectedShowIds.length === 0) {
      notify.send(NotificationType.ERROR, 'Please select at least one show to snipe');
      return;
    }
    // Increment active snipes
    selectedShowIds.forEach(() => incrementActiveSnipes());
    // Show payment modal
    setPaymentModalVisible(true);
    setPaymentError(null);
    setPaymentSuccess(false);
  };

  const handlePayment = async () => {
    if (selectedShows.length === 0) {
      setPaymentError('No shows selected for payment');
      notify.send(NotificationType.ERROR, 'No shows selected for payment');
      logger.error('Checkout attempted with no shows', { selectedShowIds });
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);
    const userId = auth.currentUser?.uid || 'anonymous';

    try {
      const result = await stripeService.createCheckoutSession(selectedShows, userId);
      if (result.success && result.checkoutUrl && result.sessionId) {
        try {
          await Linking.openURL(result.checkoutUrl);
          selectedShows.forEach(show => {
            updateAutomationResult(show.showId, {
              success: true,
              message: `Redirected to Stripe for ${show.title}`,
              transactionId: result.sessionId,
            });
          });
        } catch (error) {
          const appError = ErrorHandler.handleError(error, 'openCheckoutURL');
          setPaymentError(appError.message);
          selectedShows.forEach(show => {
            updateAutomationResult(show.showId, {
              success: false,
              message: appError.message,
            });
          });
          if (appError.retryable) {
            Alert.alert('Error', appError.message, [
              { text: 'Retry', onPress: handlePayment },
              { text: 'Cancel', onPress: handleCancelPayment },
            ]);
          }
        }
      } else {
        setPaymentError(result.message || 'Failed to initiate payment');
        notify.send(NotificationType.ERROR, result.message || 'Failed to initiate payment');
        logger.error('Checkout session creation failed', { message: result.message, sessionId: result.sessionId });
        selectedShows.forEach(show => {
          updateAutomationResult(show.showId, {
            success: false,
            message: result.message || 'Failed to initiate payment',
          });
        });
      }
    } catch (error) {
      const appError = ErrorHandler.handleError(error, 'handlePayment');
      setPaymentError(appError.message);
      selectedShows.forEach(show => {
        updateAutomationResult(show.showId, {
          success: false,
          message: appError.message,
        });
      });
      if (appError.retryable) {
        Alert.alert('Error', appError.message, [
          { text: 'Retry', onPress: handlePayment },
          { text: 'Cancel', onPress: handleCancelPayment },
        ]);
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancelPayment = () => {
    setPaymentModalVisible(false);
    setPaymentError(null);
    setPaymentSuccess(false);
    setSelectedShowIds([]);
    notify.send(NotificationType.INFO, 'Payment cancelled');
    logger.info('Payment cancelled by user', { selectedShowIds });
  };

  const handleContinue = () => {
    setPaymentModalVisible(false);
    setPaymentError(null);
    setPaymentSuccess(false);
    setSelectedShowIds([]);
    router.replace('/(tabs)/dashboard');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Ticket Sniper</Text>
          <Text style={styles.subtitle}>Ready to strike at midnight</Text>
        </View>

        <View style={styles.statsContainer}>
          {stats.map(stat => (
            <TouchableOpacity key={stat.id} style={[styles.statCard, { width: (width - 44) / 2 }]}>
              <LinearGradient
                colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                style={styles.statGradient}
              >
                <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                  <stat.icon color={stat.color} size={24} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No activity yet</Text>
              <Text style={styles.emptyStateSubtext}>Add a show to get started</Text>
            </View>
          ) : (
            <View style={styles.activityContainer}>
              {activities.map(activity => (
                <TouchableOpacity
                  key={activity.id}
                  style={[
                    styles.activityItem,
                    selectedShowIds.includes(activity.showId) && styles.activityItemSelected,
                  ]}
                  onPress={() => handleActivityPress(activity.showId, activity.status)}
                  disabled={activity.status !== 'added' && activity.status !== 'viewed'}
                >
                  <View
                    style={[
                      styles.activityStatus,
                      {
                        backgroundColor:
                          activity.status === 'success'
                            ? '#00FF88'
                            : activity.status === 'failed'
                            ? '#FF3B82'
                            : activity.status === 'added'
                            ? '#00D4FF'
                            : activity.status === 'viewed'
                            ? '#FFA500'
                            : '#FF6B00',
                      },
                    ]}
                  />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityAction}>{activity.action}</Text>
                    <Text style={styles.activityShow}>{activity.show}</Text>
                    <Text style={styles.activityTime}>{getTimeAgo(activity.timestamp)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.quickActionButton} onPress={handleQuickSnipeSetup}>
          <LinearGradient colors={['#00D4FF', '#0099CC']} style={styles.quickActionGradient}>
            <Zap color="#FFFFFF" size={24} />
            <Text style={styles.quickActionText}>Quick Snipe Setup</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={paymentModalVisible}
        onRequestClose={handleCancelPayment}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {paymentLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00D4FF" />
                <Text style={styles.loadingText}>Processing payment...</Text>
              </View>
            ) : paymentSuccess ? (
              <>
                <CheckCircle color="#00FF88" size={64} style={styles.icon} />
                <Text style={styles.successMessage}>Payment Successful!</Text>
                {paymentDetails && (
                  <View style={styles.detailsContainer}>
                    <Text style={styles.sectionTitle}>Transaction Details</Text>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Transaction ID:</Text>
                      <Text style={styles.detailValue}>{paymentDetails.sessionId}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Amount:</Text>
                      <Text style={styles.detailValue}>
                        {paymentDetails.amount
                          ? `$${paymentDetails.amount.toFixed(2)} ${paymentDetails.currency.toUpperCase()}`
                          : 'N/A'}
                      </Text>
                    </View>
                    <Text style={styles.sectionTitle}>Purchased Shows</Text>
                    {paymentDetails.showIds.map(showId => {
                      const show = shows.find(s => s.id === showId);
                      return show ? (
                        <View key={showId} style={styles.showItem}>
                          <Text style={styles.showTitle}>{show.title}</Text>
                          <Text style={styles.showDetails}>
                            Quantity: {show.preferences.quantity} | Price: ${show.preferences.maxPrice.toFixed(2)}
                          </Text>
                        </View>
                      ) : null;
                    })}
                  </View>
                )}
                <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                  <LinearGradient colors={['#00D4FF', '#0099CC']} style={styles.buttonGradient}>
                    <Text style={styles.buttonText}>Continue</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : paymentError ? (
              <>
                <XCircle color="#FF3B82" size={64} style={styles.icon} />
                <Text style={styles.errorText}>{paymentError}</Text>
                <View style={styles.buttons}>
                  <TouchableOpacity style={styles.retryButton} onPress={handlePayment}>
                    <LinearGradient colors={['#00D4FF', '#0099CC']} style={styles.buttonGradient}>
                      <Text style={styles.buttonText}>Retry Payment</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelPayment}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Confirm Payment</Text>
                <Text style={styles.sectionTitle}>Selected Shows</Text>
                {selectedShows.length === 0 ? (
                  <Text style={styles.emptyText}>No shows selected</Text>
                ) : (
                  selectedShows.map(show => (
                    <View key={show.showId} style={styles.showItem}>
                      <Text style={styles.showTitle}>{show.title}</Text>
                      <Text style={styles.showDetails}>
                        Quantity: {show.quantity} | Price: ${show.price.toFixed(2)}
                      </Text>
                    </View>
                  ))
                )}
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
                </View>
                <Text style={styles.infoText}>
                  You will be redirected to Stripe to complete your purchase securely.
                </Text>
                <View style={styles.buttons}>
                  <TouchableOpacity
                    style={[styles.payButton, paymentLoading && styles.buttonDisabled]}
                    onPress={handlePayment}
                    disabled={paymentLoading}
                  >
                    <LinearGradient colors={['#00D4FF', '#0099CC']} style={styles.buttonGradient}>
                      <Text style={styles.buttonText}>Pay with Stripe</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelPayment}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0B',
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    height: 120,
  },
  statGradient: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888888',
  },
  activityContainer: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activityItemSelected: {
    backgroundColor: 'rgba(0,212,255,0.2)',
    borderColor: '#00D4FF',
  },
  activityStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  activityShow: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#888888',
  },
  quickActionButton: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 12,
  },
  quickActionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#0A0A0B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  showItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  },
  showTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  showDetails: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginVertical: 16,
    width: '100%',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00FF88',
  },
  infoText: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 16,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  payButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#888888',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B82',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  icon: {
    marginBottom: 24,
  },
  successMessage: {
    fontSize: 20,
    fontWeight: '600',
    color: '#00FF88',
    textAlign: 'center',
    marginBottom: 24,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
});