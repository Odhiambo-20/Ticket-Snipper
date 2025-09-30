// app/modal.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { X } from 'lucide-react-native';

export default function AddShowModal() {
  const handleGoToShows = () => {
    router.back();
    router.push('/(tabs)/shows');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X color="#FFFFFF" size={24} />
        </TouchableOpacity>

        <Text style={styles.title}>Quick Snipe Setup</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.messageContainer}>
          <Text style={styles.messageTitle}>Browse Available Shows</Text>
          <Text style={styles.messageText}>
            Check out the Shows tab to see all available events and purchase tickets directly through SeatGeek.
          </Text>
          <TouchableOpacity style={styles.goToShowsButton} onPress={handleGoToShows}>
            <Text style={styles.goToShowsButtonText}>Go to Shows</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0A0A0B' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: '#FFFFFF' 
  },
  spacer: { 
    width: 40 
  },
  content: { 
    flex: 1, 
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24 
  },
  messageContainer: {
    backgroundColor: 'rgba(0,212,255,0.1)',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.3)',
    alignItems: 'center',
  },
  messageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00D4FF',
    marginBottom: 16,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  goToShowsButton: {
    backgroundColor: '#00D4FF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  goToShowsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A0A0B',
  },
});