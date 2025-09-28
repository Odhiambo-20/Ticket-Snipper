import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { TicketProvider } from '@/store/ticketStore';
import { UserProvider } from '@/store/userStore';

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

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TicketProvider>
        <UserProvider>
          <GestureHandlerRootView style={styles.gestureHandler}>
            <RootLayoutNav />
          </GestureHandlerRootView>
        </UserProvider>
      </TicketProvider>
    </QueryClientProvider>
  );
}

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