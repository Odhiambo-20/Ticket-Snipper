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

function RootLayoutNav() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ 
        headerBackTitle: "Back",
        headerStyle: styles.headerStyle,
        headerTintColor: '#FFFFFF',
        headerTitleStyle: styles.headerTitleStyle,
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: "modal",
            title: "Add Show",
            headerStyle: styles.modalHeaderStyle,
          }} 
        />
      </Stack>
    </>
  );
}

function AppContent() {
  const { updateAutomationState, updateAutomationResult } = useTicketStore();
  
  useEffect(() => {
    // Connect the store to the automation service
    setStoreCallbacks({
      updateAutomationState,
      updateAutomationResult,
    });
  }, [updateAutomationState, updateAutomationResult]);

  return <RootLayoutNav />;
}

function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  return (
    <StripeProvider
      publishableKey={stripePublishableKey}
      merchantIdentifier="merchant.com.ticketsnipper" // Replace with your merchant ID
      urlScheme="ticketsnipper" // For handling payment redirects
    >
      <QueryClientProvider client={queryClient}>
        <TicketProvider>
          <UserProvider>
            <GestureHandlerRootView style={styles.gestureHandler}>
              <AppContent />
            </GestureHandlerRootView>
          </UserProvider>
        </TicketProvider>
      </QueryClientProvider>
    </StripeProvider>
  );
}

// Export the Sentry-wrapped component as default
export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  headerStyle: {
    backgroundColor: '#0A0A0B',
  },
  modalHeaderStyle: {
    backgroundColor: '#1A1A1B',
  },
  headerTitleStyle: {
    fontWeight: '600',
  },
  gestureHandler: {
    flex: 1,
  },
});