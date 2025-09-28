import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Calendar, MapPin, Clock, Target, Play, Pause } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTicketStore } from '@/store/ticketStore';

export default function ShowsScreen() {
  const { shows, toggleSnipe } = useTicketStore();
  const insets = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(false);
  const [selectedShow, setSelectedShow] = useState<{ id: string; isActive: boolean } | null>(null);

  const handleToggleSnipe = (showId: string, isActive: boolean) => {
    if (isActive) {
      setSelectedShow({ id: showId, isActive });
      setShowModal(true);
    } else {
      toggleSnipe(showId);
    }
  };

  const confirmStopSnipe = () => {
    if (selectedShow) {
      toggleSnipe(selectedShow.id);
    }
    setShowModal(false);
    setSelectedShow(null);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Shows</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/modal')}
        >
          <Plus color="#FFFFFF" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {shows.length === 0 ? (
          <View style={styles.emptyState}>
            <Target color="#666666" size={64} />
            <Text style={styles.emptyTitle}>No Shows Added</Text>
            <Text style={styles.emptySubtitle}>
              Add your first show to start sniping tickets
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push('/modal')}
            >
              <Text style={styles.emptyButtonText}>Add Show</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.showsList}>
            {shows.map((show) => (
              <View key={show.id} style={styles.showCard}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                  style={styles.showGradient}
                >
                  <View style={styles.showHeader}>
                    <View style={styles.showInfo}>
                      <Text style={styles.showTitle}>{show.title}</Text>
                      <Text style={styles.showArtist}>{show.artist}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.snipeButton, { 
                        backgroundColor: show.isActive ? '#FF3B82' : '#00FF88' 
                      }]}
                      onPress={() => handleToggleSnipe(show.id, show.isActive)}
                    >
                      {show.isActive ? (
                        <Pause color="#FFFFFF" size={16} />
                      ) : (
                        <Play color="#FFFFFF" size={16} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.showDetails}>
                    <View style={styles.detailItem}>
                      <Calendar color="#888888" size={16} />
                      <Text style={styles.detailText}>{show.date}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <MapPin color="#888888" size={16} />
                      <Text style={styles.detailText}>{show.venue}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Clock color="#888888" size={16} />
                      <Text style={styles.detailText}>Sale: {show.saleTime}</Text>
                    </View>
                  </View>

                  <View style={styles.showPreferences}>
                    <Text style={styles.preferencesTitle}>Preferences:</Text>
                    <Text style={styles.preferencesText}>
                      Section: {show.preferences.section} • 
                      Max Price: ${show.preferences.maxPrice} • 
                      Quantity: {show.preferences.quantity}
                    </Text>
                  </View>

                  <View style={styles.showStatus}>
                    <View style={[styles.statusIndicator, {
                      backgroundColor: show.isActive ? '#00FF88' : '#666666'
                    }]} />
                    <Text style={styles.statusText}>
                      {show.isActive ? 'Snipe Active' : 'Snipe Inactive'}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Stop Snipe</Text>
            <Text style={styles.modalMessage}>Are you sure you want to stop this snipe?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton} 
                onPress={confirmStopSnipe}
              >
                <Text style={styles.confirmButtonText}>Stop</Text>
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
  addButton: {
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
  showsList: {
    padding: 16,
    gap: 16,
  },
  showCard: {
    borderRadius: 16,
    overflow: 'hidden',
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
  snipeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
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
  showPreferences: {
    marginBottom: 16,
  },
  preferencesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  preferencesText: {
    fontSize: 14,
    color: '#888888',
  },
  showStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#CCCCCC',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1B',
    borderRadius: 16,
    padding: 24,
    margin: 24,
    minWidth: 280,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#CCCCCC',
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
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#FF3B82',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});