import '@/lib/console-guard';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setUnauthorizedHandler } from '@/api/client';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { PushBridge } from '@/lib/push-bridge';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/store/auth';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hydrate = useAuthStore((s) => s.hydrate);
  const authStatus = useAuthStore((s) => s.status);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    // When the API client detects an expired/missing/invalid JWT (either as a
    // 401 or as the Flask 200-with-`message: Token is missing or invalid`
    // body), bump the user back to the login screen instead of letting them
    // sit on a zombie session with empty data everywhere.
    setUnauthorizedHandler(async () => {
      await useAuthStore.getState().logout();
      queryClient.clear();
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (fontsLoaded && authStatus !== 'unknown') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, authStatus]);

  if (!fontsLoaded || authStatus === 'unknown') {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SocketBridge />
          <PushBridge />
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="appointment-edit"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="appointment-new"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="patient-register"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="patient-edit"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="orders"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="schedule-whatsapp"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="clinical-history"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="bill-detail"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="record-payment"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="receipt"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="all-unpaid-bills"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="outstanding-by-patient"
            options={{ headerShown: false, presentation: 'modal' }}
          />
        </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function SocketBridge() {
  useSocketEvents();
  return null;
}
