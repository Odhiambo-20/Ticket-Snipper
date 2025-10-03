// app/(tabs)/shows.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { Calendar, MapPin, Clock, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react-native';
import { notify, NotificationType } from '@/services/notificationService';
import { useTicketStore } from '@/store/ticketStore';
import { useLocalSearchParams, router } from 'expo-router';
import { stripeService } from '@/services/stripeService';
import { Linking } from 'react-native';
import { auth } from '@/services/firebaseConfig';
import { ErrorHandler } from '@/services/errorHandler';
import { logger } from '@/utils/logger';

const BACKEND_API_URL = process.env.EXPO_PUBLIC_BACKEND_API_URL || 'https://ticket-snipper-backend.vercel.app';
const TICKET_API_KEY = process.env.EXPO_PUBLIC_TICKET_API_KEY || '';

interface ApiShow {
  id: string;
  title: string;
  artist: string;
  date: string;
  venue: string;
  city: string;
  saleTime: string;
  availableSeats: number;
  price: number;
  sections: string[];
  imageUrl?: string;
  eventUrl?: string;
  isAvailable: boolean;
}

interface ApiResponse {
  success: boolean;
  shows: ApiShow[];
  total: number;
  timestamp: string;
}

export default function ShowsScreen() {
  const insets = useSafeAreaInsets();
  const {
    addShow,
    addActivity,
    toggleMultipleSnipes,
    updateAutomationResult,
    incrementActiveSnipes,
    resetActiveSnipes,
    shows: storeShows,
  } = useTicketStore();
  const { fromQuickSnipe, selectedShowIds, session_id } = useLocalSearchParams<{
    fromQuickSnipe?: string;
    selectedShowIds?: string;
    session_id?: string;
  }>();
  const [shows, setShows] = useState<ApiShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<ApiShow | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [ticketQuantity, setTicketQuantity] = useState('1');
  const [appReady, setAppReady] = useState(false);
  const [selectedShows, setSelectedShows] = useState<string[]>([]);
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

  // Initialize app and fetch shows on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await fetchShows();
      } catch (err) {
        console.error('Failed to initialize app:', err);
      } finally {
        setAppReady(true);
        await SplashScreen.hideAsync();
      }
    };

    initializeApp();
  }, []);

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
            const show = storeShows.find(s => s.id === showId);
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
  }, [session_id, storeShows, updateAutomationResult]);

  // Handle Quick Snipe from Dashboard
  useEffect(() => {
    if (fromQuickSnipe && selectedShowIds) {
      const showIds = selectedShowIds.split(',').filter(id => id);
      setSelectedShows(showIds);
      toggleMultipleSnipes(showIds);
      setPaymentModalVisible(true);
      setPaymentError(null);
      setPaymentSuccess(false);
      showIds.forEach(() => incrementActiveSnipes());
    }
  }, [fromQuickSnipe, selectedShowIds, toggleMultipleSnipes, incrementActiveSnipes]);

  // Update total amount for selected shows
  useEffect(() => {
    if (selectedShows.length > 0) {
      const selected = storeShows
        .filter(show => selectedShows.includes(show.id) && shows.find(s => s.id === show.id)?.isAvailable)
        .map(show => ({
          showId: show.id,
          quantity: show.preferences.quantity,
          price: show.preferences.maxPrice,
          title: show.title,
        }));
      const total = selected.reduce((sum, show) => sum + show.price * show.quantity, 0);
      setTotalAmount(total);
    } else {
      setTotalAmount(0);
    }
  }, [selectedShows, storeShows, shows]);

  const fetchShows = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      console.log('Fetching shows from:', `${BACKEND_API_URL}/api/shows`);

      const response = await fetch(`${BACKEND_API_URL}/api/shows`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TICKET_API_KEY,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch shows: ${response.status} ${errorText}`);
      }

      const data: ApiResponse = await response.json();
      if (data.success && Array.isArray(data.shows)) {
        const uniqueShows = Array.from(
          new Map(data.shows.map(show => [show.id, show])).values()
        );
        setShows(uniqueShows);
        uniqueShows.forEach(apiShow => {
          if (!storeShows.some(s => s.id === apiShow.id)) {
            addShow({
              id: apiShow.id,
              title: apiShow.title,
              artist: apiShow.artist,
              date: apiShow.date,
              venue: apiShow.venue,
              saleTime: apiShow.saleTime,
              ticketUrl: apiShow.eventUrl || '',
              preferences: {
                section: apiShow.sections[0] || 'General',
                maxPrice: apiShow.price || 100,
                quantity: 1,
              },
              isActive: false,
            });
            notify.send(NotificationType.INFO, `Show added for ${apiShow.artist} - ${apiShow.title}`);
          }
        });
        console.log(`Loaded ${uniqueShows.length} shows`);
        if (!isRefresh) {
          notify.send(NotificationType.SUCCESS, 'Shows loaded successfully');
        }
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load shows';
      console.error('Fetch shows error:', errorMessage);
      setError(errorMessage);
      notify.send(NotificationType.ERROR, `Error: ${errorMessage}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleShowPress = (show: ApiShow) => {
    if (!show.isAvailable) {
      Alert.alert('Show Unavailable', `No tickets or valid price available for ${show.title}.`);
      notify.send(NotificationType.ERROR, `Show ${show.title} is unavailable`);
      return;
    }
    addActivity('Show viewed', `${show.artist} - ${show.title}`, show.id, 'viewed');
    setSelectedShow(show);
    setTicketQuantity('1');
    setSelectedShows([show.id]);
    setPaymentModalVisible(true);
    setPaymentError(null);
    setPaymentSuccess(false);
    incrementActiveSnipes();
  };

  const handleSelectShow = (showId: string) => {
    setSelectedShows(prev =>
      prev.includes(showId) ? prev.filter(id => id !== showId) : [...prev, showId]
    );
  };

  const handleProceedToCheckout = () => {
    if (selectedShows.length === 0) {
      notify.send(NotificationType.ERROR, 'Please select at least one show to proceed to checkout');
      return;
    }
    toggleMultipleSnipes(selectedShows);
    selectedShows.forEach(() => incrementActiveSnipes());
    setPaymentModalVisible(true);
    setPaymentError(null);
    setPaymentSuccess(false);
  };

  const handleQuickPurchase = async () => {
    if (!selectedShow) return;

    const quantity = parseInt(ticketQuantity, 10);
    if (isNaN(quantity) || quantity < 1 || quantity > selectedShow.availableSeats) {
      Alert.alert('Invalid Quantity', `Please select a quantity between 1 and ${selectedShow.availableSeats}`);
      return;
    }

    setSelectedShows([selectedShow.id]);
    setPaymentModalVisible(true);
    setPaymentError(null);
    setPaymentSuccess(false);
    incrementActiveSnipes();
  };

  const handlePayment = async () => {
    if (selectedShows.length === 0) {
      setPaymentError('No shows selected for payment');
      notify.send(NotificationType.ERROR, 'No shows selected for payment');
      logger.error('Checkout attempted with no shows', { selectedShowIds: selectedShows });
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);
    const userId = auth.currentUser?.uid || 'anonymous';

    const paymentShows = storeShows
      .filter(show => selectedShows.includes(show.id))
      .map(show => ({
        showId: show.id,
        quantity: show.preferences.quantity,
        price: show.preferences.maxPrice,
        title: show.title,
      }));

    try {
      const result = await stripeService.createCheckoutSession(paymentShows, userId);
      if (result.success && result.checkoutUrl && result.sessionId) {
        try {
          await Linking.openURL(result.checkoutUrl);
          paymentShows.forEach(show => {
            updateAutomationResult(show.showId, {
              success: true,
              message: `Redirected to Stripe for ${show.title}`,
              transactionId: result.sessionId,
            });
          });
        } catch (error) {
          const appError = ErrorHandler.handleError(error, 'openCheckoutURL');
          setPaymentError(appError.message);
          paymentShows.forEach(show => {
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
        paymentShows.forEach(show => {
          updateAutomationResult(show.showId, {
            success: false,
            message: result.message || 'Failed to initiate payment',
          });
        });
      }
    } catch (error) {
      const appError = ErrorHandler.handleError(error, 'handlePayment');
      setPaymentError(appError.message);
      paymentShows.forEach(show => {
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
    setSelectedShows([]);
    resetActiveSnipes();
    notify.send(NotificationType.INFO, 'Payment cancelled');
    logger.info('Payment cancelled by user', { selectedShowIds: selectedShows });
  };

  const handleContinue = () => {
    setPaymentModalVisible(false);
    setPaymentError(null);
    setPaymentSuccess(false);
    setSelectedShows([]);
    resetActiveSnipes();
    router.replace('/(tabs)/shows');
  };

  const onRefresh = () => fetchShows(true);

  if (!appReady || (loading && !refreshing)) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Shows</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D4FF" />
          <Text style={styles.loadingText}>Loading shows...</Text>
        </View>
      </View>
    );
  }

  if (error && shows.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Shows</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => fetchShows()}>
            <RefreshCw color="#FFFFFF" size={24} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle color="#FF3B82" size={64} />
          <Text style={styles.errorTitle}>Failed to Load Shows</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text style={styles.errorHint}>
            Check your backend connection at:{'\n'}
            {BACKEND_API_URL}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchShows()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Available Shows</Text>
          <Text style={styles.subtitle}>{shows.length} shows available</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={() => fetchShows(true)} disabled={refreshing}>
          <RefreshCw color="#FFFFFF" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4FF" colors={['#00D4FF']} />
        }
      >
        {shows.length === 0 ? (
          <View style={styles.emptyState}>
            <AlertCircle color="#666666" size={64} />
            <Text style={styles.emptyTitle}>No Shows Available</Text>
            <Text style={styles.emptySubtitle}>Check back later for new shows or try a different location</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => fetchShows()}>
              <Text style={styles.emptyButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {shows.map((show, index) => (
              <TouchableOpacity
                key={`${show.id}-${index}`}
                activeOpacity={0.8}
                onPress={() => handleShowPress(show)}
                onLongPress={() => handleSelectShow(show.id)}
              >
                <View style={[styles.showCard, selectedShows.includes(show.id) && styles.selectedShowCard]}>
                  <LinearGradient
                    colors={
                      show.isAvailable
                        ? ['rgba(0,212,255,0.1)', 'rgba(0,255,136,0.05)']
                        : ['rgba(255,59,130,0.1)', 'rgba(255,59,130,0.05)']
                    }
                    style={styles.showGradient}
                  >
                    <View style={styles.showHeader}>
                      <View style={styles.showInfo}>
                        <Text style={styles.showTitle}>{show.title}</Text>
                        <Text style={styles.showArtist}>{show.artist}</Text>
                      </View>
                      <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>Starting Price</Text>
                        <Text style={[styles.priceValue, !show.isAvailable && styles.unavailablePrice]}>
                          {show.price > 0 ? `$${show.price.toFixed(2)}` : 'N/A'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.showDetails}>
                      <View style={styles.detailItem}>
                        <Calendar color="#888888" size={16} />
                        <Text style={styles.detailText}>{show.date}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <MapPin color="#888888" size={16} />
                        <Text style={styles.detailText}>{show.venue}, {show.city}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Clock color="#888888" size={16} />
                        <Text style={styles.detailText}>{show.saleTime}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailText}>Sections: {show.sections.join(', ')}</Text>
                      </View>
                    </View>

                    <View style={styles.availabilityContainer}>
                      <View
                        style={[
                          styles.availabilityBadge,
                          { backgroundColor: show.isAvailable ? '#00FF88' : '#FF3B82' },
                        ]}
                      >
                        <Text style={styles.availabilityText}>
                          {show.isAvailable ? `${show.availableSeats} tickets` : 'UNAVAILABLE'}
                        </Text>
                      </View>
                      {show.isAvailable && (
                        <Text style={styles.tapToSecure}>Tap to buy or long press to select</Text>
                      )}
                    </View>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            ))}
            {selectedShows.length > 0 && (
              <TouchableOpacity style={styles.checkoutButton} onPress={handleProceedToCheckout}>
                <LinearGradient colors={['#00D4FF', '#0099CC']} style={styles.checkoutGradient}>
                  <Text style={styles.checkoutButtonText}>
                    Proceed to Checkout ({selectedShows.length} shows)
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancelPayment}
      >
        <View style={styles.modalOverlay}>
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
                    <View style={styles.modalDetailItem}>
                      <Text style={styles.detailLabel}>Transaction ID:</Text>
                      <Text style={styles.detailValue}>{paymentDetails.sessionId}</Text>
                    </View>
                    <View style={styles.modalDetailItem}>
                      <Text style={styles.detailLabel}>Amount:</Text>
                      <Text style={styles.detailValue}>
                        {paymentDetails.amount
                          ? `$${paymentDetails.amount.toFixed(2)} ${paymentDetails.currency.toUpperCase()}`
                          : 'N/A'}
                      </Text>
                    </View>
                    <Text style={styles.sectionTitle}>Purchased Shows</Text>
                    {paymentDetails.showIds.map(showId => {
                      const show = storeShows.find(s => s.id === showId);
                      return show ? (
                        <View key={showId} style={styles.showItem}>
                          <Text style={styles.showTitle}>{show.title}</Text>
                          <Text style={styles.modalShowDetailsText}>
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
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.modalRetryButton} onPress={handlePayment}>
                    <LinearGradient colors={['#00D4FF', '#0099CC']} style={styles.buttonGradient}>
                      <Text style={styles.buttonText}>Retry Payment</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelPayment}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : selectedShow && selectedShows.length === 1 && !fromQuickSnipe ? (
              <>
                <Text style={styles.modalTitle}>Quick Purchase</Text>
                <Text style={styles.modalShowTitle}>{selectedShow.title}</Text>
                <Text style={styles.modalShowDetails}>
                  {selectedShow.artist} • {selectedShow.venue}, {selectedShow.city}
                </Text>
                <Text style={styles.modalShowDate}>{selectedShow.date}</Text>
                <View style={styles.modalPriceRow}>
                  <Text style={styles.modalPriceLabel}>Price per ticket:</Text>
                  <Text style={styles.modalPriceValue}>${selectedShow.price.toFixed(2)}</Text>
                </View>
                <View style={styles.modalSeatsRow}>
                  <Text style={styles.modalSeatsLabel}>Available Tickets:</Text>
                  <Text style={styles.modalSeatsValue}>{selectedShow.availableSeats}</Text>
                </View>
                <View style={styles.modalSeatsRow}>
                  <Text style={styles.modalSeatsLabel}>Sections:</Text>
                  <Text style={styles.modalSeatsValue}>{selectedShow.sections.join(', ')}</Text>
                </View>
                <View style={styles.modalQuantityRow}>
                  <Text style={styles.modalQuantityLabel}>Quantity:</Text>
                  <TextInput
                    style={styles.quantityInput}
                    value={ticketQuantity}
                    onChangeText={text => {
                      setTicketQuantity(text);
                      const quantity = parseInt(text, 10) || 1;
                      storeShows.forEach(show => {
                        if (show.id === selectedShow.id) {
                          addShow({ ...show, preferences: { ...show.preferences, quantity } });
                        }
                      });
                    }}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#888888"
                  />
                </View>
                <Text style={styles.modalWarning}>
                  ⚡ You will be redirected to Stripe to complete your purchase
                </Text>
                <Text style={styles.modalPaymentInfo}>
                  Payment methods: Credit Card, PayPal, Apple Pay (via Stripe)
                </Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelPayment}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.purchaseButton, paymentLoading && styles.buttonDisabled]}
                    onPress={handlePayment}
                    disabled={paymentLoading}
                  >
                    <LinearGradient colors={['#00D4FF', '#0099CC']} style={styles.buttonGradient}>
                      <Text style={styles.buttonText}>Pay with Stripe</Text>
                    </LinearGradient>
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
                  selectedShows.map(showId => {
                    const show = storeShows.find(s => s.id === showId);
                    return show ? (
                      <View key={showId} style={styles.showItem}>
                        <Text style={styles.showTitle}>{show.title}</Text>
                        <Text style={styles.modalShowDetailsText}>
                          Quantity: {show.preferences.quantity} | Price: ${show.preferences.maxPrice.toFixed(2)}
                        </Text>
                      </View>
                    ) : null;
                  })
                )}
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
                </View>
                <Text style={styles.modalWarning}>
                  You will be redirected to Stripe to complete your purchase securely.
                </Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelPayment}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.purchaseButton, paymentLoading && styles.buttonDisabled]}
                    onPress={handlePayment}
                    disabled={paymentLoading}
                  >
                    <LinearGradient colors={['#00D4FF', '#0099CC']} style={styles.buttonGradient}>
                      <Text style={styles.buttonText}>Pay with Stripe</Text>
                    </LinearGradient>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#888888',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#FF3B82',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#00D4FF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#00D4FF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  showCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  selectedShowCard: {
    borderWidth: 2,
    borderColor: '#00D4FF',
  },
  showGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  showHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  showInfo: {
    flex: 1,
  },
  showTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  showArtist: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginLeft: 16,
  },
  priceLabel: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00FF88',
  },
  unavailablePrice: {
    color: '#FF3B82',
    fontStyle: 'italic',
  },
  showDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  availabilityContainer: {
    alignItems: 'flex-start',
    gap: 8,
  },
  availabilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0A0A0B',
  },
  tapToSecure: {
    fontSize: 12,
    color: '#00FF88',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  checkoutButton: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  checkoutGradient: {
    padding: 18,
    alignItems: 'center',
  },
  checkoutButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1B',
    borderRadius: 16,
    padding: 24,
    margin: 24,
    minWidth: 300,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00D4FF',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalShowTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalShowDetails: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 4,
  },
  modalShowDate: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
  },
  modalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  modalPriceLabel: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  modalPriceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00FF88',
  },
  modalSeatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalSeatsLabel: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  modalSeatsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00D4FF',
  },
  modalQuantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalQuantityLabel: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  quantityInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    width: 60,
    textAlign: 'center',
    fontSize: 14,
  },
  modalWarning: {
    fontSize: 12,
    color: '#FFA500',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  modalPaymentInfo: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  purchaseButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 14,
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
  icon: {
    marginBottom: 24,
    alignSelf: 'center',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  modalDetailItem: {
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
  showItem: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  modalShowDetailsText: {
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
  emptyText: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B82',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalRetryButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
});