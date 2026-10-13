import { Redirect } from 'expo-router';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { useSession } from '@/context/session';

export default function IndexRoute() {
  const { loading, session, profile } = useSession();
  if (loading) return <View style={styles.loading}>
    <Image accessibilityLabel="Kindling" source={require('@/assets/images/kindling-mark.png')} resizeMode="contain" style={styles.mark} />
    <Text style={styles.wordmark}>Kindling</Text>
    <Text style={styles.message}>Getting your learning space ready…</Text>
    <ActivityIndicator size="small" color={Brand.teal} style={styles.spinner} />
  </View>;
  if (!session) return <Redirect href="/sign-in" />;
  if (!profile?.isOnboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.parchment, padding: 32 },
  mark: { width: 92, height: 92, marginBottom: 18 },
  wordmark: { color: Brand.pine, fontSize: 27, fontWeight: '800', letterSpacing: -0.5 },
  message: { color: Brand.muted, fontSize: 14, marginTop: 8 },
  spinner: { marginTop: 28 },
});
