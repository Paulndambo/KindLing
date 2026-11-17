# RevenueCat subscriptions in Kindling

## Installed preview APK: subscriptions are not configured

The installed preview APK is a release build. It selects live RevenueCat billing and needs `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` with the Android public SDK key (`goog_…`). A `test_…` key cannot be substituted: RevenueCat Test Store is supported in debug/development builds, and current SDKs deliberately reject release builds using it.

With the supplied Test Store key, use the development profile:

```powershell
# From mobile-app, build and install the development APK:
npx eas-cli@latest build --platform android --profile development
# After installing the APK, run Metro and open Kindling's development app:
npx expo start --dev-client --clear
```

The development profile explicitly selects Test Store and includes the supplied public test key. It requires Metro; it is not a standalone release APK. Expo Go cannot replace the development app.

To keep using a standalone preview APK, create/connect the Android app in RevenueCat, obtain its `goog_` public SDK key, and add it as `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` in the EAS **preview** environment (plain-text visibility is appropriate for this publishable key). Configure the Google Play subscription/base plan and attach it to `premium` and the Monthly package for the Android app; Test Store products do not become Google Play products automatically. Use Google Play sandbox/license-test accounts for billing tests. Then rebuild and install the preview APK:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

Configure the same public-key variable in the EAS **production** environment before production builds. iOS requires its own `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` (`appl_…`) and store setup. The build profiles explicitly select their EAS environment. A pre-install build hook checks the selected mode and platform key, rejecting missing/mismatched keys before an unusable APK/IPA is produced. Existing APKs are not changed by editing environment variables; build and install an updated app. [Expo environment variables](https://docs.expo.dev/eas/environment-variables/), [Test Store restrictions](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store#test-store-api-keys-in-release-builds).

## Offering diagnostics

The supplied Test Store key was checked on November 17, 2026. Android and iOS returned offering `default`, package `$rc_monthly`, and product `monthly_2599`. The real Web SDK additionally confirmed price USD `$25.99` and period `P1M`; the returned price is not `$25.00`.

In a development build, opening checkout prints `[Kindling subscriptions]` with version `kindling-offerings-v2`, the current offering, package IDs, product IDs, and prices. No customer data or API keys are logged. The resolver uses the standard Monthly shortcut, then the `$rc_monthly` package, then the exact `monthly_2599` product (including its Android base-plan suffix). It does not choose an arbitrary package or another offering. If checkout remains unavailable, use that log to distinguish a missing package, customer-specific targeting, or an old bundle. The read-only `frontend/scripts/check-revenuecat.mjs` script checks the shared Test Store with the real browser SDK; it does not verify the native binary or native checkout.

## Correcting a $9.99 Test Store price to $25/month

Prices come from RevenueCat’s product/paywall configuration. Test Store prices are fixed at product creation, so create a replacement product such as `monthly_25` with USD 25 pricing and a one-month recurring period. Attach it to `premium` and replace the Test Store product in the current offering’s standard Monthly package (`$rc_monthly`). Both apps now use that package regardless of product ID; product-ID environment overrides are unnecessary and can be removed. Restart Vite and Metro and fully reload the mobile development app after updating the code. Verify both paywall and final checkout show $25. Existing purchases retain their original terms. Live Apple/Google/web prices require separate configuration. [Test Store price changes](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store#changing-test-store-products-and-prices).

The Expo mobile app now includes the SDK integration, account identity synchronization, customer-info updates, `premium` entitlement checking, a RevenueCat paywall, a direct monthly purchase API, restoration, and optional Customer Center. The native profile screen uses store subscriptions; the browser profile retains its existing invoice flow.

Dashboard configuration and device checkout still need to be completed and tested with your account. This integration does not change the backend's subscription records or AI limits. Complete the server verification work in step 7 before launching paid AI access.

## 1. Install with npx

From `mobile-app`:

```powershell
npx expo install react-native-purchases react-native-purchases-ui
npx expo install expo-dev-client
```

These commands have already been run in this workspace. Both RevenueCat packages are on 11.0.3; the development client matches Expo SDK 58. Native modules are autolinked; no RevenueCat config plugin or manual native project changes are needed. [RevenueCat Expo installation](https://www.revenuecat.com/docs/getting-started/installation/expo).

## 2. Configure public SDK keys

Development builds default to Test Store with your supplied key:

```text
test_fZjmZvPdUliuCFbHZhXKkkUcSYw
```

For explicit settings, copy `.env.example` to `.env.local`. Expo inlines `EXPO_PUBLIC_*` variables into the app; these must contain only public SDK keys, never RevenueCat secret API keys.

```dotenv
EXPO_PUBLIC_REVENUECAT_MODE=test
EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=test_fZjmZvPdUliuCFbHZhXKkkUcSYw
EXPO_PUBLIC_REVENUECAT_CUSTOMER_CENTER=false
```

Release builds default to live mode. Before a production build, set these values in its EAS environment (remove any local `MODE=test` override):

```dotenv
EXPO_PUBLIC_REVENUECAT_MODE=live
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_YOUR_PUBLIC_IOS_SDK_KEY
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_YOUR_PUBLIC_ANDROID_SDK_KEY
EXPO_PUBLIC_REVENUECAT_CUSTOMER_CENTER=false
```

Test Store is for debug/development builds, not the preview/production release profiles. Both the build preflight and runtime configuration reject a Test Store override in a release bundle. Missing or incorrect live key prefixes fail the build preflight rather than falling back to Test Store. Rebuild after changing the release environment; an OTA update cannot install the native SDK.

The supplied `test_` key uses RevenueCat's simulated store, without real charges. It does not test Apple or Google billing. [Test Store guide](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store).

## 3. Create the product, entitlement, offering, and paywall

In your RevenueCat project:

1. Open **Product catalog → Products**, select the Test Store, and create a subscription named **Monthly**, identifier **`monthly`**, with a one-month recurring period. Choose the price in the dashboard.
2. Open **Entitlements**, create **`premium`**, and attach `monthly` to it. Identifier spelling and case must match.
3. Open **Offerings**, create an offering such as **`default`**, and make it the current/default offering.
4. Add RevenueCat's standard **Monthly** package (`$rc_monthly`) to the offering and attach the `monthly` product. The code reads `offerings.current.monthly`; a custom package named `monthly` is a different package and will not satisfy this setup.
5. Create and publish a RevenueCat Paywall attached to that offering. Include the Monthly package, localized pricing and renewal terms, restore control, privacy policy, and terms links. Configure your real policy URLs in the dashboard.
6. For production, connect the iOS and Android apps in **Apps & providers** and configure store credentials. In App Store Connect create an auto-renewing monthly subscription in a subscription group. In Play Console create a subscription with an active monthly auto-renewing base plan. Import/associate the store products with `premium` and the offering's Monthly package.

This implementation selects `offerings.current.monthly` for each platform. The underlying product ID can change remotely, including when replacing a Test Store product. Continue checking access through `premium`.

Android already uses `com.kindling.app`. Set `expo.ios.bundleIdentifier` in `app.json` to your registered iOS identifier before creating an iOS store build; the correct identifier must come from your Apple app registration.

[Entitlements](https://www.revenuecat.com/docs/getting-started/entitlements), [offerings and products](https://www.revenuecat.com/docs/getting-started/displaying-products), [RevenueCat Paywalls](https://www.revenuecat.com/docs/tools/paywalls).

## 4. Build and run

Expo Go is deliberately excluded from checkout so its preview APIs cannot be mistaken for real purchases. Build a development client after installing the native dependencies:

```powershell
npx eas-cli@latest build --platform android --profile development
# Install the resulting development build, then start Metro:
npx expo start --dev-client
```

For iOS, use the same command with `--platform ios` and install on a registered device. The existing `development` build profile already sets `developmentClient: true`. Cloud builds work from Windows; local iOS builds require macOS. If Android tooling is installed, `npx expo run:android` is an alternative.

Sign in, open **Profile → Your subscription → View Premium plans**. The app presents `RevenueCatUI.presentPaywallIfNeeded` using the current offering and required entitlement `premium`. Purchases and restores inside the paywall are handled by RevenueCat; the provider retrieves customer info after dismissal and listens for SDK updates.

## 5. Complete application code and usage

The complete implementation is in:

- `src/services/purchases.ts`: public keys, platform guards, single SDK configuration, serialized account changes, error messages, and entitlement helper.
- `src/context/purchases.tsx`: `PurchasesProvider`, identity binding, customer-info listener, foreground refresh, `purchaseMonthly`, `restore`, `presentPaywall`, and `manageSubscription`.
- `src/components/subscription-card.tsx`: the profile UI, duplicate-tap prevention, cancellation handling, pending-payment/network errors, renewal/expiration display, and restoration feedback.
- `src/app/_layout.tsx`: provider placement inside `SessionProvider`.

The provider configures the SDK with `String(session.id)` as `appUserID`. Account changes call `logIn`; signing out calls `logOut` only for an identified SDK customer. The SDK is configured once per JS runtime. Calls and identity changes are serialized, and state is scoped to the current Kindling user. Keep these IDs stable and consistent with server-side RevenueCat lookups. Do not identify customers by email.

Here is a complete reusable screen using the existing provider, including direct checkout if you want a custom purchase button instead of the profile's RevenueCat Paywall:

```tsx
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { CustomerInfo } from 'react-native-purchases';
import { BodyText, Button } from '@/components/mobile-ui';
import { usePurchases } from '@/context/purchases';
import { hasPremium, purchaseErrorMessage } from '@/services/purchases';

export default function PremiumScreen() {
  const { supported, ready, isPremium, customerInfo, error,
    purchaseMonthly, presentPaywall, restore, refresh } = usePurchases();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function perform(action: () => Promise<CustomerInfo>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice('');
    try {
      const info = await action();
      setNotice(hasPremium(info) ? 'Premium is active.' : 'No active Premium entitlement.');
    } catch (cause) {
      setNotice(await purchaseErrorMessage(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (!supported) return <BodyText>Use an iOS or Android development build.</BodyText>;
  return <View style={{ gap: 12, padding: 24 }}>
    <Text>{isPremium ? 'Premium active' : ready ? 'Spark' : 'Checking subscription'}</Text>
    <Text>{customerInfo?.entitlements.active.premium?.expirationDate ?? ''}</Text>
    {!isPremium ? <>
      <Button disabled={busy} onPress={() => void perform(presentPaywall)}>View plans</Button>
      <Button disabled={busy} onPress={() => void perform(purchaseMonthly)}>Subscribe monthly</Button>
    </> : null}
    <Button disabled={busy} onPress={() => void perform(restore)}>Restore purchases</Button>
    <Button disabled={busy} onPress={() => void perform(refresh)}>Refresh status</Button>
    <Text accessibilityLiveRegion="polite">{notice || error}</Text>
  </View>;
}
```

For a production custom checkout screen, display `offerings.current.monthly.product.priceString` and the subscription period next to the purchase button; fetch these through `withPurchases(String(session.id), sdk => sdk.getOfferings())`. Never hardcode `$25` or infer localized prices from the backend plan catalog. The implemented profile paywall gets pricing and terms from RevenueCat's offering automatically.

Use `isPremium` for client feature visibility. The entitlement check is:

```ts
const premiumActive = customerInfo?.entitlements.active.premium?.isActive === true;
```

`refresh()` calls `Purchases.getCustomerInfo()`. The SDK manages caching; this is not necessarily a forced network fetch. `customerInfo` also provides active subscriptions, purchase history, entitlement renewal state, expiration, and `managementURL`. Listener cleanup occurs on account changes/unmount. A listener is not a push connection to RevenueCat; foreground refresh and SDK activity retrieve updates. Retain the SDK's cached entitlement during transient connectivity failures. Cancellation does not revoke access before expiration. [Customer info documentation](https://www.revenuecat.com/docs/customers/customer-info).

## 6. Customer Center and subscription management

The native profile shows **Manage subscription** for live Premium customers. By default it opens Apple's native subscription management sheet or Google's subscription management URL. It refreshes customer info on return/dismissal and when the app foregrounds.

If your RevenueCat plan supports Customer Center (currently Pro or Enterprise), configure its support details, restoration, cancellation/refund flows, and optional promotional offers in the dashboard, then set:

```dotenv
EXPO_PUBLIC_REVENUECAT_CUSTOMER_CENTER=true
```

`manageSubscription()` will then use `RevenueCatUI.presentCustomerCenter()`. Customer Center is disabled in Test Store mode; test real store management and refunds with store sandbox accounts. The standalone **Restore purchases** button stays available even without Customer Center. [Customer Center availability](https://www.revenuecat.com/docs/tools/customer-center), [React Native integration](https://www.revenuecat.com/docs/tools/customer-center/customer-center-react-native).

## 7. Subscription management and backend enforcement

The existing `/api/platform/subscription/` plan controls server resources independently from the SDK. A successful mobile purchase currently updates RevenueCat and the mobile entitlement UI; it does not update that backend plan or increase AI quotas.

Before paid launch, implement a backend RevenueCat integration using server-held credentials. Resolve the signed-in Kindling user to the same RevenueCat app user ID, verify active `premium` server-side, and reconcile the platform plan. Use authenticated, idempotent webhooks for lifecycle events and a server verification endpoint for purchase-time reconciliation. Handle renewals, expiration, billing issues, refunds/revocations, and transfers; do not downgrade merely because auto-renew was disabled. Sandbox/Test Store events must not grant production server access. Never trust a client-sent `isPremium` boolean or client transaction response as authorization. [RevenueCat webhooks](https://www.revenuecat.com/docs/integrations/webhooks).

Review RevenueCat restore/transfer behavior for your account model and test ownership changes. Require explicit user action to restore, avoid automatic restore on launch, keep restore accessible to returning users, and do not store an independent permanent `premium=true` flag locally. The native account deletion dialog explains that deleting the account does not cancel store subscriptions.

## 8. Verification

```powershell
npx tsc --noEmit
npx expo lint
node --test tests/purchases.test.mjs
```

Device checks after dashboard setup:

1. Fresh account: Spark, Monthly package loaded with localized price, correct legal links.
2. Purchase success: `premium` activates, profile updates, matching app user ID appears in RevenueCat.
3. User cancellation: no error alert and no entitlement granted.
4. Failed or pending payment: clear feedback; unlock only when customer info contains active `premium`.
5. Restore: active subscriptions restore; an empty restore reports no Premium found.
6. Sign out, sign in as a different account, and restart: no previous user's entitlement is displayed. Verify your configured store ownership/transfer policy.
7. Disable auto-renew: access remains until entitlement expiry. Expiration/refund: access updates after SDK refresh.
8. Offline launch/foreground: cached subscription remains usable; errors allow retry.
9. Live keys with sandbox accounts: Apple and Google purchase/restore/management work, then verify Customer Center if enabled.

Test Store validates the app integration. Native store sandbox tests and server authorization tests remain necessary before release.

## Troubleshooting: Expo Go reports `document is not available`

The SDK falls back to its browser implementation in Expo Go, but React Native has no browser `document`. Installing packages does not add native modules to Expo Go. The app checks both Expo environment metadata and the presence of `RNPurchases`, `RNPaywalls`, and `RNCustomerCenter` before importing the SDK. This also blocks development binaries built before the packages were installed.

After updating this code, stop Metro and fully close the running app. From `mobile-app`, run:

```powershell
npx eas-cli@latest build --platform android --profile development
# Install and open the Kindling development APK, then:
npx expo start --dev-client --clear
```

Open the installed **Kindling** development app, rather than scanning with Expo Go. If it still reports missing native modules, rebuild the development APK with the current dependencies. Changing the Test Store key or adding a browser `document` polyfill will not install the required native paywall UI.
