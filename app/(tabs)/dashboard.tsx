import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Target, TrendingUp, Zap } from 'lucide-react-native';
import { useTicketStore } from '@/store/ticketStore';
import { router } from 'expo-router';
import { notify, NotificationType } from '@/services/notificationService';

export default function DashboardScreen() {
  const { shows, activeSnipes, activities } = useTicketStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedShowIds, setSelectedShowIds] = useState<string[]>([]);

  useEffect(() => {
    if (activities.length > 0) {
      const latestActivity = activities[0];
      notify.send(
        latestActivity.status === 'success' ? NotificationType.SUCCESS :
        latestActivity.status === 'failed' ? NotificationType.ERROR :
        NotificationType.INFO,
        `${latestActivity.action} for ${latestActivity.show}`,
        { activityId: latestActivity.id }
      );
    }
  }, [activities]);

  const stats = [
    { id: 'active-shows', label: 'Active Shows', value: shows.length, icon: Target, color: '#00D4FF' },
    { id: 'successful-snipes', label: 'Successful Snipes', value: activities.filter(a => a.status === 'success').length, icon: TrendingUp, color: '#00FF88' },
    { id: 'running-snipes', label: 'Running Snipes', value: activeSnipes, icon: Zap, color: '#FF6B00' },
    { id: 'next-snipe', label: 'Next Snipe', value: shows.find(s => s.isActive)?.saleTime || 'N/A', icon: Clock, color: '#FF3B82' },
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
    // Only allow selection for 'added' or 'viewed' activities
    if (status === 'added' || status === 'viewed') {
      setSelectedShowIds(prev => 
        prev.includes(showId) 
          ? prev.filter(id => id !== showId)
          : [...prev, showId]
      );
    }
  };

  const handleQuickSnipeSetup = () => {
    if (selectedShowIds.length === 0) {
      notify.send(NotificationType.ERROR, 'Please select at least one show to snipe');
      return;
    }
    router.push({
      pathname: '/(tabs)/shows',
      params: { 
        fromQuickSnipe: 'true',
        selectedShowIds: selectedShowIds.join(','),
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Ticket Sniper</Text>
          <Text style={styles.subtitle}>Ready to strike at midnight</Text>
        </View>

        <View style={styles.statsContainer}>
          {stats.map((stat) => (
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
              {activities.map((activity) => (
                <TouchableOpacity 
                  key={activity.id} 
                  style={[
                    styles.activityItem,
                    selectedShowIds.includes(activity.showId) && styles.activityItemSelected
                  ]}
                  onPress={() => handleActivityPress(activity.showId, activity.status)}
                  disabled={activity.status !== 'added' && activity.status !== 'viewed'}
                >
                  <View style={[styles.activityStatus, { 
                    backgroundColor: 
                      activity.status === 'success' ? '#00FF88' : 
                      activity.status === 'failed' ? '#FF3B82' : 
                      activity.status === 'added' ? '#00D4FF' : 
                      activity.status === 'viewed' ? '#FFA500' : 
                      '#FF6B00' 
                  }]} />
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
          <LinearGradient
            colors={['#00D4FF', '#0099CC']}
            style={styles.quickActionGradient}
          >
            <Zap color="#FFFFFF" size={24} />
            <Text style={styles.quickActionText}>Quick Snipe Setup</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
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
});