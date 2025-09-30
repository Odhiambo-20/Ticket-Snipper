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
  Linking,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { Calendar, MapPin, Clock, RefreshCw, AlertCircle } from 'lucide-react-native';
import { notify, NotificationType } from '@/services/notificationService';
import { useTicketStore } from '@/store/ticketStore';
import { useLocalSearchParams } from 'expo-router';

const BACKEND_API_URL = process.env.EXPO_PUBLIC_BACKEND_API_URL || 'http://10.0.2.2:3000';
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
  isAvailable: boolean; // New field to indicate availability
}

interface ApiResponse {
  success: boolean;
  shows: ApiShow[];
  total: number;
  timestamp: string;
}

export default function ShowsScreen() {
  const insets = useSafeAreaInsets();
  const { addShow, addActivity, toggleMultipleSnipes, updateAutomationResult, shows: storeShows } = useTicketStore();
  const { fromQuickSnipe, selectedShowIds } = useLocalSearchParams<{ fromQuickSnipe?: string; selectedShowIds?: string }>();
  const [shows, setShows] = useState<ApiShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<ApiShow | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [ticketQuantity, setTicketQuantity] = useState('1');
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();
        await fetchShows();
        setAppReady(true);
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('Splash screen error:', e);
        setError('Failed to initialize app');
        setAppReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (fromQuickSnipe && selectedShowIds) {
      const showIds = selectedShowIds.split(',').filter(id => id);
      if (showIds.length > 0) {
        toggleMultipleSnipes(showIds);
        handleQuickPurchaseForMultiple(showIds);
      }
    }
  }, [fromQuickSnipe, selectedShowIds]);

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
    setShowPaymentModal(true);
  };

  const handleQuickPurchaseForMultiple = async (showIds: string[]) => {
    for (const showId of showIds) {
      const show = shows.find(s => s.id === showId);
      if (!show) {
        updateAutomationResult(showId, {
          success: false,
          message: `Show with ID ${showId} not found`,
        });
        notify.send(NotificationType.ERROR, `Show with ID ${showId} not found`);
        continue;
      }
      if (!show.isAvailable) {
        updateAutomationResult(showId, {
          success: false,
          message: `Show ${show.title} has no available tickets or valid price`,
        });
        notify.send(NotificationType.ERROR, `Show ${show.title} is unavailable`);
        continue;
      }

      try {
        const response = await fetch(`${BACKEND_API_URL}/api/shows/${showId}/reserve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': TICKET_API_KEY,
          },
          body: JSON.stringify({ quantity: 1 }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Reservation failed: ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.checkoutUrl) {
          updateAutomationResult(showId, {
            success: true,
            message: 'Purchase successful',
            transactionId: data.sessionId || `trans-${Date.now()}`,
          });
          notify.send(NotificationType.SUCCESS, `Redirecting to Stripe for ${show.title}`);
          await Linking.openURL(data.checkoutUrl);
        } else {
          throw new Error(data.message || 'Failed to create reservation');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Reservation failed';
        updateAutomationResult(showId, {
          success: false,
          message: errorMessage,
        });
        notify.send(NotificationType.ERROR, `Purchase failed for ${show.title}: ${errorMessage}`);
      }
    }
    fetchShows(true);
  };

  const handleQuickPurchase = async () => {
    if (!selectedShow) return;

    const quantity = parseInt(ticketQuantity, 10);
    if (isNaN(quantity) || quantity < 1 || quantity > selectedShow.availableSeats) {
      Alert.alert('Invalid Quantity', `Please select a quantity between 1 and ${selectedShow.availableSeats}`);
      return;
    }

    setShowPaymentModal(false);

    try {
      const response = await fetch(`${BACKEND_API_URL}/api/shows/${selectedShow.id}/reserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TICKET_API_KEY,
        },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Reservation failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.checkoutUrl) {
        updateAutomationResult(selectedShow.id, {
          success: true,
          message: 'Purchase successful',
          transactionId: data.sessionId || `trans-${Date.now()}`,
        });
        notify.send(NotificationType.SUCCESS, `Redirecting to Stripe for ${selectedShow.title}`);
        await Linking.openURL(data.checkoutUrl);
        fetchShows(true);
      } else {
        throw new Error(data.message || 'Failed to create reservation');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Reservation failed';
      updateAutomationResult(selectedShow.id, {
        success: false,
        message: errorMessage,
      });
      notify.send(NotificationType.ERROR, `Purchase failed for ${selectedShow.title}: ${errorMessage}`);
      Alert.alert('Reservation Failed', errorMessage, [
        { text: 'Retry', onPress: () => handleQuickPurchase() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
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
          shows.map((show, index) => (
            <TouchableOpacity
              key={`${show.id}-${index}`}
              activeOpacity={0.8}
              onPress={() => handleShowPress(show)}
              disabled={!show.isAvailable}
            >
              <View style={styles.showCard}>
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
                      <Text style={styles.tapToSecure}>Tap to buy with Stripe ⚡</Text>
                    )}
                  </View>
                </LinearGradient>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Quick Purchase</Text>
            {selectedShow && (
              <>
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
                    onChangeText={setTicketQuantity}
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
              </>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.purchaseButton} onPress={handleQuickPurchase}>
                <Text style={styles.purchaseButtonText}>Buy with Stripe</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#00FF88',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A0A0B',
  },
});