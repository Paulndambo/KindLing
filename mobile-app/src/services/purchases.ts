import Constants, { ExecutionEnvironment } from 'expo-constants';
import { NativeModules, Platform } from 'react-native';
import type Purchases from 'react-native-purchases';
import type { CustomerInfo, PurchasesOffering } from 'react-native-purchases';

export const PREMIUM_ENTITLEMENT = 'premium';
export function monthlyPackage(offering: PurchasesOffering | null) {
  if (!offering) throw new Error('No subscription plans are available right now. Please try again later.');
  const packages = offering.availablePackages || [];
  const item = offering.monthly || packages.find((pkg) => pkg.identifier === '$rc_monthly') ||
    packages.find((pkg) => pkg.product.identifier === 'monthly_2599' || pkg.product.identifier.startsWith('monthly_2599:'));
  if (!item) throw new Error('The monthly plan is unavailable right now. Please try again later.');
  return item;
}

export async function getPurchaseOfferings(purchases: typeof Purchases) {
  const offerings = await purchases.getOfferings();
  if (__DEV__) console.info('[Kindling subscriptions]', JSON.stringify({
    version: 'kindling-offerings-v2',
    current: offerings.current?.identifier ?? null,
    offerings: Object.values(offerings.all).map((offering) => ({
      id: offering.identifier,
      monthly: offering.monthly?.identifier ?? null,
      packages: offering.availablePackages.map((pkg) => ({
        id: pkg.identifier, product: pkg.product.identifier, price: pkg.product.priceString,
      })),
    })),
  }));
  return offerings;
}
// Environment metadata alone is insufficient: Expo Go and older development
// binaries may not contain these native modules. Check before importing either SDK.
export const purchasesSupported = (Platform.OS === 'ios' || Platform.OS === 'android') &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
  !!NativeModules.RNPurchases && !!NativeModules.RNPaywalls && !!NativeModules.RNCustomerCenter;
export const testStoreEnabled = (process.env.EXPO_PUBLIC_REVENUECAT_MODE ?? (__DEV__ ? 'test' : 'live')) === 'test';
export const customerCenterEnabled = process.env.EXPO_PUBLIC_REVENUECAT_CUSTOMER_CENTER === 'true' && !testStoreEnabled;

function apiKey() {
  if (testStoreEnabled && !__DEV__) {
    throw new Error('This test subscription configuration requires a development build. Please install the Kindling development app.');
  }
  const key = testStoreEnabled
    ? process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY || 'test_fZjmZvPdUliuCFbHZhXKkkUcSYw'
    : Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  if (!key) throw new Error('Subscriptions are not configured for this build. Please contact support.');
  if (!testStoreEnabled && !key.startsWith(Platform.OS === 'ios' ? 'appl_' : 'goog_')) {
    throw new Error('A platform-specific RevenueCat public SDK key is required for live purchases.');
  }
  return key;
}

// Serialize identity changes and purchases, including across provider remounts.
let pending: Promise<unknown> = Promise.resolve();
function serialize<T>(work: () => Promise<T>): Promise<T> {
  const result = pending.then(work);
  pending = result.catch(() => undefined);
  return result;
}

async function sdk() {
  if (!purchasesSupported) throw new Error('Subscriptions require an iOS or Android development build.');
  return (await import('react-native-purchases')).default;
}

export function withPurchases<T>(userId: string, work: (purchases: typeof Purchases) => Promise<T>): Promise<T> {
  return serialize(async () => {
    const purchases = await sdk();
    if (!await purchases.isConfigured()) {
      const { LOG_LEVEL } = await import('react-native-purchases');
      purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
      purchases.configure({ apiKey: apiKey(), appUserID: userId });
    } else if (await purchases.getAppUserID() !== userId) {
      await purchases.logIn(userId);
    }
    return work(purchases);
  });
}

export function resetPurchaseIdentity() {
  return serialize(async () => {
    if (!purchasesSupported) return;
    const purchases = await sdk();
    if (await purchases.isConfigured() && !await purchases.isAnonymous()) await purchases.logOut();
  });
}

export function hasPremium(info: CustomerInfo | null) {
  return info?.entitlements.active[PREMIUM_ENTITLEMENT]?.isActive === true;
}

export async function purchaseErrorMessage(error: unknown): Promise<string> {
  const value = error as { code?: string; message?: string } | null;
  // Even importing the SDK activates its browser fallback in Expo Go.
  if (!purchasesSupported) return value?.message || 'Subscriptions require an iOS or Android development build.';
  const { PURCHASES_ERROR_CODE } = await import('react-native-purchases');
  // RevenueCat codes are strings; do not display cancellation as a failure.
  if (value?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return '';
  if (value?.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'Your payment is pending approval. Premium will unlock when it is approved.';
  if (value?.code === PURCHASES_ERROR_CODE.NETWORK_ERROR) return 'Could not connect to the store. Check your connection and try again.';
  return value?.message || 'Could not complete this subscription request. Please try again.';
}
