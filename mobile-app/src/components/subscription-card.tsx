import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CustomerInfo } from 'react-native-purchases';

import { BodyText, Button, SectionTitle, ui } from '@/components/mobile-ui';
import { Brand } from '@/constants/brand';
import { usePurchases } from '@/context/purchases';
import { hasPremium, PREMIUM_ENTITLEMENT, purchaseErrorMessage, testStoreEnabled } from '@/services/purchases';

export function SubscriptionCard() {
  const purchases = usePurchases();
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const entitlement = purchases.customerInfo?.entitlements.active[PREMIUM_ENTITLEMENT];

  async function perform(action: () => Promise<CustomerInfo>, restoring = false) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const info = await action();
      if (restoring) setMessage(hasPremium(info) ? 'Your Premium access has been restored.' : 'No active Premium subscription was found for this account.');
    } catch (cause) {
      setError(await purchaseErrorMessage(cause));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return <View style={styles.container}>
    <SectionTitle>Your subscription</SectionTitle>
    <View style={[ui.card, styles.container]}>
      <Text style={styles.title}>{purchases.isPremium ? 'Kindling Premium' : purchases.ready ? 'Kindling Spark' : 'Subscription status unavailable'}</Text>
      <BodyText>{purchases.isPremium ? 'Your Premium subscription is active.' : 'Get more AI and advanced learning tools with Premium.'}</BodyText>
      {entitlement?.expirationDate ? <BodyText>
        {entitlement.willRenew ? 'Renews' : 'Access until'} {new Date(entitlement.expirationDate).toLocaleDateString()}
      </BodyText> : null}
      {testStoreEnabled ? <BodyText>Test Store purchases — no real charges.</BodyText> : null}
      {!purchases.supported ? <BodyText>Subscriptions need a Kindling development build with RevenueCat installed. Expo Go cannot display the native paywall.</BodyText> : <>
        {!purchases.isPremium ? <Button disabled={busy} onPress={() => void perform(purchases.presentPaywall)}>View Premium plans</Button> : null}
        {purchases.isPremium && !testStoreEnabled ? <Button disabled={busy} onPress={() => void perform(purchases.manageSubscription)}>Manage subscription</Button> : null}
        <Button variant="secondary" disabled={busy} onPress={() => void perform(purchases.restore, true)}>Restore purchases</Button>
        <Button variant="plain" busy={busy} onPress={() => void perform(purchases.refresh)}>Refresh subscription</Button>
      </>}
      {error || purchases.error ? <Text accessibilityRole="alert" style={styles.error}>{error || purchases.error}</Text> : null}
      {message ? <BodyText accessibilityLiveRegion="polite">{message}</BodyText> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: { color: Brand.ink, fontSize: 22, fontWeight: '700' },
  error: { color: Brand.error, fontSize: 14 },
});
