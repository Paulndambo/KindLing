import * as SplashScreen from 'expo-splash-screen';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider, useSession } from '@/context/session';
import { PurchasesProvider } from '@/context/purchases';
import { Brand } from '@/constants/brand';
import {
  configureNotificationsHandler,
  initializeAndSyncPushNotifications,
  subscribeToNotificationResponses,
} from '@/services/notifications';

SplashScreen.preventAutoHideAsync();
configureNotificationsHandler();

function RootNavigator() {
  const { loading, session, profile } = useSession();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  useEffect(() => {
    if (loading || !session || !profile?.isOnboarded) return;
    void initializeAndSyncPushNotifications(
      profile.name || session.name,
      profile.goal,
    );
  }, [loading, session, profile?.isOnboarded, profile?.name, profile?.goal]);

  useEffect(() => {
    return subscribeToNotificationResponses((data) => {
      if (data?.subject && data?.topic) {
        router.push({
          pathname: '/lesson',
          params: {
            subject: String(data.subject),
            topic: String(data.topic),
            unit: String(data.topic),
          },
        });
        return;
      }
      if (data?.route === '/(tabs)/assessments') {
        router.push('/(tabs)/assessments');
        return;
      }
      router.push('/(tabs)/learn');
    });
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Brand.parchment } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!loading && !session}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={!loading && !!session}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!loading && !!session && !!profile?.isOnboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="lesson" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return <SessionProvider><PurchasesProvider><RootNavigator /></PurchasesProvider></SessionProvider>;
}
