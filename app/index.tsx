// app/index.tsx
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, LogBox } from 'react-native';
import { useEffect } from 'react';
import { scheduler } from '@/services/scheduler';

// 🚫 Suppress warnings
LogBox.ignoreLogs([
  'Route missing default export',
  'expo-notifications',
  'PayPal.initialize',
  'SplashModule',
]);

export default function Index() {
  useEffect(() => {
    const initialize = async () => {
      try {
        await scheduler.scheduleMidnightTask();
      } catch (error) {
        console.error('Initialization failed', error);
      }
    };
    initialize();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Redirect href="/(tabs)/shows" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});