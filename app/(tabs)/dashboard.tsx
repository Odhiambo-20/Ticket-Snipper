import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Target, TrendingUp, Zap } from 'lucide-react-native';
import { useTicketStore } from '@/store/ticketStore';

export default function DashboardScreen() {
  const { shows, activeSnipes } = useTicketStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const stats = [
    { id: 'active-shows', label: 'Active Shows', value: shows.length, icon: Target, color: '#00D4FF' },
    { id: 'successful-snipes', label: 'Successful Snipes', value: 12, icon: TrendingUp, color: '#00FF88' },
    { id: 'running-snipes', label: 'Running Snipes', value: activeSnipes, icon: Zap, color: '#FF6B00' },
    { id: 'next-snipe', label: 'Next Snipe', value: '2h 15m', icon: Clock, color: '#FF3B82' },
  ];

  const activities = [
    { id: 'activity-1', action: 'Snipe scheduled', show: 'Taylor Swift - Eras Tour', time: '2 min ago', status: 'scheduled' },
    { id: 'activity-2', action: 'Tickets secured', show: 'Coldplay - Music of Spheres', time: '1 hour ago', status: 'success' },
    { id: 'activity-3', action: 'Snipe failed', show: 'Ed Sheeran - Mathematics Tour', time: '3 hours ago', status: 'failed' },
  ];

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
          <View style={styles.activityContainer}>
            {activities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={[styles.activityStatus, { 
                  backgroundColor: activity.status === 'success' ? '#00FF88' : 
                                 activity.status === 'failed' ? '#FF3B82' : '#FF6B00' 
                }]} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityAction}>{activity.action}</Text>
                  <Text style={styles.activityShow}>{activity.show}</Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.quickActionButton}>
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