import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import type { CustomerInfo } from 'react-native-purchases';

import { useSession } from '@/context/session';
import {
  customerCenterEnabled, getPurchaseOfferings, hasPremium, monthlyPackage, PREMIUM_ENTITLEMENT,
  purchasesSupported, resetPurchaseIdentity, withPurchases,
} from '@/services/purchases';

type PurchaseState = { userId: string; customerInfo: CustomerInfo };
type PurchaseContext = {
  supported: boolean;
  ready: boolean;
  isPremium: boolean;
  customerInfo: CustomerInfo | null;
  error: string;
  refresh: () => Promise<CustomerInfo>;
  purchaseMonthly: () => Promise<CustomerInfo>;
  restore: () => Promise<CustomerInfo>;
  presentPaywall: () => Promise<CustomerInfo>;
  manageSubscription: () => Promise<CustomerInfo>;
};
const Context = createContext<PurchaseContext | null>(null);

export function PurchasesProvider({ children }: PropsWithChildren) {
  const { session, loading } = useSession();
  const userId = session ? String(session.id) : null;
  const currentUser = useRef(userId);
  useEffect(() => { currentUser.current = userId; }, [userId]);
  const [state, setState] = useState<PurchaseState | null>(null);
  const [failure, setFailure] = useState<{ userId: string; message: string } | null>(null);

  const run = useCallback(async (work: Parameters<typeof withPurchases<CustomerInfo>>[1]) => {
    if (!userId) throw new Error('Sign in to manage your subscription.');
    const info = await withPurchases(userId, work);
    if (currentUser.current === userId) {
      setState({ userId, customerInfo: info });
      setFailure(null);
    }
    return info;
  }, [userId]);

  const refresh = useCallback(() => run((purchases) => purchases.getCustomerInfo()), [run]);

  useEffect(() => {
    let active = true;
    let removeListener: (() => void) | undefined;
    if (loading || !purchasesSupported) return;
    if (!userId) {
      void resetPurchaseIdentity().catch(() => { /* Next sign-in retries identity synchronization. */ });
      return;
    }
    void withPurchases(userId, async (purchases) => {
      if (!active) return;
      const onUpdate = (customerInfo: CustomerInfo) => {
        if (active && currentUser.current === userId) setState({ userId, customerInfo });
      };
      purchases.addCustomerInfoUpdateListener(onUpdate);
      removeListener = () => purchases.removeCustomerInfoUpdateListener(onUpdate);
      onUpdate(await purchases.getCustomerInfo());
    }).catch((cause) => {
      if (active) setFailure({ userId, message: cause instanceof Error ? cause.message : 'Could not load your subscription.' });
    });
    return () => { active = false; removeListener?.(); };
  }, [loading, userId]);

  useEffect(() => {
    if (!userId || !purchasesSupported) return;
    const listener = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh().catch(() => { /* Preserve the SDK's cached entitlement while offline. */ });
    });
    return () => listener.remove();
  }, [refresh, userId]);

  const purchaseMonthly = useCallback(() => run(async (purchases) => {
    const offering = (await getPurchaseOfferings(purchases)).current;
    const { customerInfo } = await purchases.purchasePackage(monthlyPackage(offering));
    return customerInfo;
  }), [run]);

  const restore = useCallback(() => run((purchases) => purchases.restorePurchases()), [run]);

  const presentPaywall = useCallback(() => run(async (purchases) => {
    const info = await purchases.getCustomerInfo();
    if (hasPremium(info)) return info;
    const offering = (await getPurchaseOfferings(purchases)).current;
    monthlyPackage(offering);
    const { default: ui, PAYWALL_RESULT } = await import('react-native-purchases-ui');
    const result = await ui.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: PREMIUM_ENTITLEMENT,
      offering: offering!, displayCloseButton: true,
    });
    if (result === PAYWALL_RESULT.ERROR) throw new Error('The paywall could not complete your request. Please try again.');
    return purchases.getCustomerInfo();
  }), [run]);

  const manageSubscription = useCallback(() => run(async (purchases) => {
    if (customerCenterEnabled) {
      const { default: ui } = await import('react-native-purchases-ui');
      await ui.presentCustomerCenter();
    } else if (Platform.OS === 'ios') {
      await purchases.showManageSubscriptions();
    } else {
      const info = await purchases.getCustomerInfo();
      await Linking.openURL(info.managementURL || 'https://play.google.com/store/account/subscriptions');
    }
    return purchases.getCustomerInfo();
  }), [run]);

  const customerInfo = state?.userId === userId ? state.customerInfo : null;
  return <Context.Provider value={{ supported: purchasesSupported, ready: !!customerInfo, customerInfo,
    isPremium: hasPremium(customerInfo), error: failure?.userId === userId ? failure.message : '',
    refresh, purchaseMonthly, restore, presentPaywall, manageSubscription }}>
    {children}
  </Context.Provider>;
}

export function usePurchases() {
  const value = useContext(Context);
  if (!value) throw new Error('usePurchases must be used inside PurchasesProvider');
  return value;
}
