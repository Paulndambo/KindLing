# RevenueCat Web SDK in Kindling

## Backend 401 errors while the offering loads

`Given token not valid for any token type` from `/api/auth/me/` is a Kindling authentication failure, separate from RevenueCat offerings. The API client now shares a single `/api/auth/refresh/` attempt across concurrent expired-token requests, retries each request once, and updates the reactive sign-in state. Invalid/expired refresh tokens open the sign-in dialog; temporary network/server errors retain the saved session. An old refresh response cannot overwrite another account's credentials.

Protected profile/subject requests and RevenueCat initialization wait for authentication bootstrap. A first expired-token request can still appear as 401 in browser Network tools, followed by a successful refresh and retry. Repeated rejection requires signing in again. If the previous API client has already removed the saved tokens, reload and sign in once; removed credentials cannot be recovered automatically. An offering log containing `current: default` and `monthly: $rc_monthly` confirms the subscription package is loading, even when backend authentication fails.

Run `node --test tests/api-session.test.mjs tests/session-recovery.test.mjs tests/revenuecat.test.mjs` to verify session recovery and subscription selection. These are automated tests with simulated responses, not a completed checkout in the user's browser.

## Checking the actual offering response

Run `node scripts/check-revenuecat.mjs` from `frontend` (Chrome required). This read-only diagnostic loads the real Web SDK and fetches offerings without presenting checkout or making a purchase. It uses the configured public SDK key, defaults to Test Store, and prints only offering/package/product metadata. To check account-specific targeting, append `--user-id YOUR_KINDLING_USER_ID`.

On November 17, 2026, the supplied Test Store key returned current offering `default`, standard package `$rc_monthly`, product `monthly_2599`, period `P1M`, and USD `$25.99`. The native Android and iOS offerings API returned the same package/product mapping. This confirms the default offering is configured; a customer can still receive another offering through targeting or experiments. `$25.99` is the returned price, not `$25.00`.

The app logs `[Kindling subscriptions]` with version `kindling-offerings-v2` in Test Store mode. It lists the actual current offering and available packages without customer data or API keys. Both clients resolve the standard Monthly shortcut, then `$rc_monthly` in available packages, then the exact known `monthly_2599` product if the convenience shortcut is missing. They do not select an arbitrary package or another offering. If the error persists, inspect that response and verify the running/deployed bundle is updated. Restarting a server does not rebuild a deployed website; deploy the latest `npm run build` output through your normal hosting workflow.

## Correcting a $9.99 Test Store price to $25/month

The SDK displays the price configured in RevenueCat. Changing local plan metadata does not change the price charged at checkout. Test Store product prices cannot be edited after creation: create a replacement product such as `monthly_25`, with a USD 25 price and one-month recurring duration, attach it to `premium`, and replace the Test Store product in the current offering's standard Monthly package. Keep the published paywall attached to that offering and use its dynamic package price instead of static $9.99 text. Existing purchases retain their original terms.

Both apps select the current offering’s standard Monthly package, regardless of the attached product identifier. Product-ID environment variables are no longer needed and can be removed. Restart Vite and Metro and fully reload the mobile development app after updating the code. For live billing, separately configure USD 25/month in RevenueCat Billing, App Store Connect, and Google Play as applicable. Verify the paywall and final checkout price before purchasing. [RevenueCat Test Store price changes](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store#changing-test-store-products-and-prices).

Kindling's `frontend` now uses `@revenuecat/purchases-js` 1.74.0. Settings → Subscription presents a RevenueCat Paywall or direct Monthly checkout, reads customer info, checks `premium`, and links live subscribers to their subscription management page. The SDK is loaded only after authentication has finished.

The dashboard configuration below and a real billing sandbox checkout still require your RevenueCat account. Backend AI quotas continue using the existing backend subscription records; complete the server verification described below before launching paid access.

## 1. Install with npm

From `frontend`:

```powershell
npm install --save @revenuecat/purchases-js
```

This command has already been run, and both package files were updated. The Web SDK includes web checkout and paywall presentation; do not install the React Native UI SDK in this frontend. [Installation](https://www.revenuecat.com/docs/getting-started/installation/web-sdk).

## 2. Configure your public key

Vite development defaults to Test Store using your provided key:

```dotenv
VITE_REVENUECAT_MODE=test
VITE_REVENUECAT_TEST_API_KEY=test_fZjmZvPdUliuCFbHZhXKkkUcSYw
```

You can copy `.env.example` to `.env.local` to set these explicitly. Restart Vite after changing environment values. `VITE_*` values are included in browser JavaScript, so use public SDK keys only. Never place a RevenueCat secret API key or Stripe secret key in a Vite variable.

Production builds default to live mode and require a RevenueCat Billing public SDK key:

```dotenv
VITE_REVENUECAT_MODE=live
VITE_REVENUECAT_WEB_API_KEY=rcb_YOUR_WEB_BILLING_PUBLIC_SDK_KEY
```

Set these in the hosting/build environment before `npm run build`. Ensure `.env.local` does not override live mode. The integration rejects missing keys and mismatched prefixes instead of silently falling back to Test Store in production. It specifically configures RevenueCat Billing; Stripe Billing/Paddle Billing would require their own matching configuration and key validation.

The supplied `test_` key belongs to RevenueCat Test Store. It simulates success, failure, and cancellation without charging a payment method. It is separate from a RevenueCat Billing sandbox connected to Stripe. [Test Store](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store).

## 3. Configure Monthly, premium, and the offering

Use the same RevenueCat project as mobile so the same Kindling account can access the same entitlement across platforms:

1. In **Product catalog → Products**, select Test Store and create **Monthly**, identifier **`monthly`**, as a recurring one-month subscription. Choose the test price when creating it.
2. In **Entitlements**, create or reuse **`premium`** and attach `monthly` to it.
3. In **Offerings**, create or reuse an offering such as **`default`** and mark it as current/default.
4. Add the standard **Monthly** package (`$rc_monthly`) and associate the Test Store `monthly` product. A custom package named `monthly` is different from the standard Monthly package. The app reads `offerings.current.monthly`.
5. Create and publish a RevenueCat Paywall for that offering. Include Monthly pricing, renewal terms, and valid public privacy/terms URLs. Preview narrow/mobile and desktop layouts.
6. For actual web billing, create a **RevenueCat Billing** web configuration and connect the Stripe payment gateway using the dashboard. Configure a web product with identifier **`monthly`**, a recurring one-month period (`P1M`), and your chosen price/currencies. Attach it to `premium` and to the same offering's Monthly package for that web configuration. Existing mobile products remain attached for their respective stores.
7. Configure branding, business/support details, taxes, lifecycle emails, and your production domain/payment methods in the RevenueCat/Stripe dashboards before live checkout.

The app selects `offerings.current.monthly`; the attached product can be `monthly`, `monthly_25`, or another identifier. Continue checking access through `premium`. No product-ID environment override is required.

[Web SDK setup](https://www.revenuecat.com/docs/web/web-billing/web-sdk), [Web Paywalls](https://www.revenuecat.com/docs/web/paywalls).

## 4. Run and use the integrated UI

```powershell
npm run dev
```

Sign in to Kindling, open **Settings → Subscription**, and select **View Premium paywall**. The SDK creates and manages its full-screen browser overlay. Its `onBack` callback closes the paywall. The alternative **Subscribe monthly** button opens direct SDK checkout for the standard Monthly package.

Prices are read from `package.product.price.formattedPrice`. The implementation uses the modern `Package.product` and `Product.price` properties, rather than deprecated `webBillingProduct`, `rcBillingProduct`, or `currentPrice`. The checkout/paywall shows the final price, taxes, trials/offers, and renewal terms. There is no hardcoded $25 checkout price or yearly option for this monthly-only integration.

After a successful purchase the returned `customerInfo` updates Premium immediately. Cancellation is quiet. Failed and pending payments show readable messages; pending payment does not grant access without an active entitlement. Refresh on window focus and tab visibility changes checks for account changes, expiry, and subscription management changes.

## 5. Complete implementation files

- `src/services/revenuecat-client.js`: SDK lifecycle, account switching, serialized operations, offering lookup, paywall/direct checkout, error handling, entitlement and management URL helpers.
- `src/services/revenuecat.js`: Vite configuration and lazy SDK import.
- `src/hooks/useRevenueCat.js`: account-scoped React customer info, foreground refresh, checkout state, and `isPremium`.
- `src/components/settings/RevenueCatSubscription.jsx`: pricing, paywall and monthly purchase buttons, status, errors, and Customer Portal link.
- `src/App.jsx`: calls the hook once with the authenticated session and passes it to Settings.

The SDK is configured once per runtime. `appUserId` is **`String(userSession.id)`**, matching the mobile integration. Switching accounts calls `changeUser`; signing out resets an existing SDK instance to a generated anonymous identity while removing the previous account's displayed state. A signed-out visitor never initializes checkout. Email is passed as optional checkout contact information, rather than used as the identity.

The service serializes account changes and purchases and rechecks the current account immediately before checkout. The hook prevents duplicate checkout clicks. Customer data is scoped by account ID so a previous user's Premium status is not rendered after switching accounts. Do not call `Purchases.configure` again from a component or a second screen.

## 6. Complete plain JavaScript example

The existing React frontend uses the files above. This standalone example illustrates the same Web SDK API calls for a page that already knows the authenticated Kindling user's ID. Use it as an alternative integration, not alongside the app's existing singleton.

```html
<p id="subscription-status" role="status" aria-live="polite"></p>
<button id="paywall">View Premium plans</button>
<button id="monthly">Subscribe monthly</button>
<button id="refresh">Refresh subscription</button>
<a id="manage" hidden target="_blank" rel="noopener noreferrer">Manage subscription</a>
<script type="module" src="/subscription-example.js"></script>
```

```js
// subscription-example.js — served by a bundler such as Vite.
import { Purchases, ErrorCode, LogLevel } from '@revenuecat/purchases-js';

export function initializeSubscriptions(authenticatedUser) {
  if (authenticatedUser?.id == null) throw new Error('Sign in first.');
  Purchases.setLogLevel(LogLevel.Debug); // Use LogLevel.Error for production.
  const purchases = Purchases.configure({
    apiKey: 'test_fZjmZvPdUliuCFbHZhXKkkUcSYw',
    appUserId: String(authenticatedUser.id),
  });
  const status = document.getElementById('subscription-status');
  const manage = document.getElementById('manage');
  const paywall = document.getElementById('paywall');
  const monthly = document.getElementById('monthly');
  const refresh = document.getElementById('refresh');
  let busy = false;
  let monthlyAvailable = false;

  function render(info) {
    const premium = info.entitlements.active.premium?.isActive === true;
    status.textContent = premium ? 'Premium active' : 'Spark';
    paywall.hidden = premium;
    monthly.hidden = premium || !monthlyAvailable;
    const url = info.managementURL ? new URL(info.managementURL) : null;
    manage.hidden = !url || url.protocol !== 'https:';
    if (!manage.hidden) manage.href = url.href;
  }

  async function perform(action) {
    if (busy) return;
    busy = true;
    paywall.disabled = monthly.disabled = refresh.disabled = true;
    try {
      render(await action());
    } catch (error) {
      if (error.errorCode !== ErrorCode.UserCancelledError) {
        status.textContent = error.errorCode === ErrorCode.PaymentPendingError
          ? 'Payment pending approval.'
          : error.errorCode === ErrorCode.NetworkError
            ? 'Check your connection and try again.'
            : error.message || 'Subscription request failed. Please retry.';
      }
    } finally {
      busy = false;
      paywall.disabled = monthly.disabled = refresh.disabled = false;
    }
  }

  async function getMonthlyOffering() {
    const offering = (await purchases.getOfferings()).current;
    if (!offering?.monthly) {
      throw new Error('Monthly is unavailable. Check your RevenueCat offering.');
    }
    return offering;
  }

  paywall.onclick = () => perform(async () => {
    const info = await purchases.getCustomerInfo();
    if (info.entitlements.active.premium?.isActive) return info;
    const result = await purchases.presentPaywall({
      offering: await getMonthlyOffering(),
      customerEmail: authenticatedUser.email,
      onBack: (closePaywall) => closePaywall(),
    });
    return result.customerInfo;
  });

  monthly.onclick = () => perform(async () => {
    const info = await purchases.getCustomerInfo();
    if (info.entitlements.active.premium?.isActive) return info;
    const offering = await getMonthlyOffering();
    const result = await purchases.purchase({
      rcPackage: offering.monthly,
      customerEmail: authenticatedUser.email,
    });
    return result.customerInfo;
  });

  refresh.onclick = () => perform(() => purchases.getCustomerInfo());
  const onFocus = () => { void perform(() => purchases.getCustomerInfo()); };
  window.addEventListener('focus', onFocus);
  void perform(async () => {
    const info = await purchases.getCustomerInfo();
    // Pricing availability must not suppress an existing subscriber's entitlement.
    try {
      const offering = await getMonthlyOffering();
      monthlyAvailable = true;
      monthly.textContent = `Subscribe for ${offering.monthly.product.price.formattedPrice} / month`;
    } catch {
      monthly.hidden = true; // The main app also displays an offering error/retry state.
    }
    return info;
  });

  return () => {
    window.removeEventListener('focus', onFocus);
    paywall.onclick = monthly.onclick = refresh.onclick = null;
  };
}
// Your authentication bootstrap calls initializeSubscriptions(user) once.
// Replace the test key with a configured rcb_ public key for RevenueCat Billing.
```

For account switching and sign-out, use the complete app service/hook implementation, which serializes identity changes with checkout. The standalone example assumes a stable signed-in account for the lifetime of the page. Cancel an open checkout before allowing an identity transition in a separate implementation.

## 7. Entitlements, refresh, and subscription management

Client access checking:

```js
const info = await purchases.getCustomerInfo();
const isPremium = info.entitlements.active.premium?.isActive === true;
```

Read `customerInfo` for active entitlements, expiration dates, subscription history, and `managementURL`. Treat cancellation as disabling renewal; an active entitlement can remain valid until expiration even when `willRenew` is false. Do not create a permanent localStorage `premium=true` flag. The Web SDK does not provide the React Native customer-info listener API; this integration retrieves info at account initialization, checkout completion, explicit refresh, and browser focus/visibility changes.

Native **Customer Center** is not exposed as `presentCustomerCenter()` by this Web SDK. Web subscription management uses the **Customer Portal**. The app renders `customerInfo.managementURL` as a validated HTTPS link, opened in a new tab, and refreshes when the customer returns. For RevenueCat Billing, portal links also appear in billing emails; the portal supports cancellation, payment-method updates, receipts/invoices, and configured plan changes. For purchases made in App Store/Google Play, the management URL can point to that store instead.

Do not add the native Customer Center or restore-purchases button to the web paywall. Web access is recovered by signing into the same Kindling account and refreshing. If there is no management URL, the UI directs the customer to their billing email or the original mobile store. Test Store simulates purchases and does not exercise a real billing portal.

[Customer info](https://www.revenuecat.com/docs/customers/customer-info), [Customer Center](https://www.revenuecat.com/docs/tools/customer-center), [Web Customer Portal](https://www.revenuecat.com/docs/web/web-billing/customer-portal).

## 8. Server authorization and launch requirements

An active RevenueCat entitlement updates the new web subscription UI. It does not yet update `/api/platform/subscription/`, backend AI limits, or the existing backend-controlled AI routing entitlements. The app keeps showing backend usage separately; it no longer requests upgrade invoices or changes backend cancellation state from the subscription checkout screen.

Before paid launch, implement authenticated backend reconciliation using server-held RevenueCat credentials. Resolve the authenticated Kindling user to the same RevenueCat app user ID, verify `premium` server-side, and map the verified result to the backend plan/quotas. Receive authenticated, idempotent RevenueCat lifecycle webhooks for renewals, expiry, billing issues, transfers, refunds, and revocations; add purchase-time server verification to avoid waiting solely for webhooks. Never trust browser-provided `isPremium`, plan IDs, localStorage, or the client purchase result as server authorization. Test Store/sandbox events must not grant production server access.

Use HTTPS for production and configure real policy/support URLs. Keep public SDK keys separate by test/live environment. Do not log payment/customer details in production. Explain that deleting a Kindling account does not cancel its billing subscription, and offer management before deletion. Review ownership/transfer behavior for shared mobile/web subscriptions. [Webhooks](https://www.revenuecat.com/docs/integrations/webhooks).

## 9. Verification and testing

```powershell
node --test tests/revenuecat.test.mjs
npm run build
npm run lint
```

The service tests simulate the SDK and cover identity changes during checkout, current-offering selection, direct checkout, existing Premium access, error handling, missing live keys, load retries, and management URL validation. The browser smoke test mounts the real hook and component with a simulated SDK:

```powershell
# Terminal 1:
npm run dev -- --host 127.0.0.1 --port 5176 --strictPort
# Terminal 2 (Chrome installed):
node scripts/smoke-revenuecat.mjs
```

After dashboard setup, manually test real Test Store paywall/direct purchases, cancellation, failure, pending payments, expiry, sign-out/account changes, and refreshing on another device. Verify the RevenueCat customer ID exactly matches `String(userSession.id)` and `premium` is actually attached to `monthly`.

Next test with a RevenueCat Billing sandbox public key (`MODE=live` selects the configured `rcb_` key; it does not itself decide whether that key belongs to sandbox or production). Verify provider checkout, billing emails, Customer Portal, renewal, cancellation until expiry, refund/revocation, backend reconciliation, and server quotas before deploying your production key. [Web purchase testing](https://www.revenuecat.com/docs/web/web-billing/testing).

Troubleshooting: empty offerings generally indicate the wrong app/key or missing package/product association. A paywall error can indicate no published paywall on the current offering. A successful checkout without Premium usually means `monthly` is not attached to `premium`; never grant Premium just because the checkout returned successfully. A Test Store checkout does not validate your Stripe configuration.
