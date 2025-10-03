import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { StripeProvider } from '@stripe/stripe-react-native';
import { TicketProvider, useTicketStore } from '@/store/ticketStore';
import { UserProvider } from '@/store/userStore';
import { setStoreCallbacks } from '@/services/ticketAutomation';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://f4d377e1cc65735c50c33efa04d27186@o4510101357002752.ingest.us.sentry.io/4510101358313472',
  sendDefaultPii: true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AppContent() {
  const { updateAutomationState, updateAutomationResult } = useTicketStore();
  
  useEffect(() => {
    // Connect the store to the automation service
    // The callback receives data from the automation service
    setStoreCallbacks((data: any) => {
      // Handle the callback data and update the store accordingly
      if (data.showId) {
        // If there's a checkoutUrl, it means the automation was successful
        if (data.checkoutUrl) {
          updateAutomationResult(data.showId, {
            success: true,
            message: `Purchase scheduled for ${data.eventTitle || 'event'}. Checkout URL: ${data.checkoutUrl}`,
            transactionId: data.showId,
          });
          updateAutomationState(data.showId, 'stopped');
        } else if (data.state) {
          // If there's a state update
          updateAutomationState(data.showId, data.state);
        } else if (data.error) {
          // If there's an error
          updateAutomationResult(data.showId, {
            success: false,
            message: data.error,
          });
          updateAutomationState(data.showId, 'stopped');
        }
      }
    });
  }, [updateAutomationState, updateAutomationResult]);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

function RootLayout() {
  const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  return (
    <GestureHandlerRootView style={styles.gestureHandler}>
      <StripeProvider
        publishableKey={stripePublishableKey}
        merchantIdentifier="merchant.com.ticketsnipper"
        urlScheme="ticketsnipper"
      >
        <QueryClientProvider client={queryClient}>
          <TicketProvider>
            <UserProvider>
              <AppContent />
            </UserProvider>
          </TicketProvider>
        </QueryClientProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}

// Export the Sentry-wrapped component as default
export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  gestureHandler: {
    flex: 1,
  },
});