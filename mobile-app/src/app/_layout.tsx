import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider, useSession } from '@/context/session';
import { Brand } from '@/constants/brand';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { loading, session, profile } = useSession();
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

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
  return <SessionProvider><RootNavigator /></SessionProvider>;
}
