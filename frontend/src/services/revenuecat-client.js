// Kept separate from Vite configuration so account/checkout behavior can be tested.
export const PREMIUM_ENTITLEMENT = "premium";

export function hasPremium(customerInfo) {
  return customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT]?.isActive === true;
}

export function monthlyPackage(offering) {
  if (!offering) throw new Error("No subscription plans are available right now. Please try again later.");
  // The standard Monthly package is stable across product/price changes.
  // Its underlying store product ID is configured remotely in RevenueCat.
  const packages = offering.availablePackages || [];
  const pkg = offering.monthly || packages.find((item) => item.identifier === "$rc_monthly") ||
    packages.find((item) => item.product?.identifier === "monthly_2599");
  if (!pkg) throw new Error("The monthly plan is unavailable right now. Please try again later.");
  return pkg;
}

export function offeringDiagnostics(offerings) {
  return {
    version: "kindling-offerings-v2",
    current: offerings.current?.identifier ?? null,
    offerings: Object.values(offerings.all || {}).map((offering) => ({
      id: offering.identifier,
      monthly: offering.monthly?.identifier ?? null,
      packages: (offering.availablePackages || []).map((pkg) => ({
        id: pkg.identifier, product: pkg.product?.identifier, price: pkg.product?.price?.formattedPrice,
      })),
    })),
  };
}

export function managementUrl(customerInfo) {
  const value = customerInfo?.managementURL;
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function createRevenueCatClient({ loadSdk, apiKey, testMode, browserAvailable, onDiagnostics = () => {} }) {
  let sdkPromise;
  let instance;
  let activeUserId = null;
  let pending = Promise.resolve();

  async function getOfferings(purchases) {
    const offerings = await purchases.getOfferings();
    onDiagnostics(offeringDiagnostics(offerings));
    return offerings;
  }

  function serialize(work) {
    const result = pending.then(work);
    pending = result.catch(() => undefined);
    return result;
  }

  function assertUser(userId) {
    if (!userId || userId !== activeUserId) throw new Error("Sign in to your Kindling account to manage this subscription.");
  }

  async function sdk() {
    if (!browserAvailable()) throw new Error("Web checkout requires a browser.");
    if (!apiKey || !apiKey.startsWith(testMode ? "test_" : "rcb_")) {
      throw new Error(testMode ? "A RevenueCat Test Store public key is required." : "Web subscriptions need a RevenueCat Billing public SDK key.");
    }
    if (!sdkPromise) sdkPromise = loadSdk().catch((error) => { sdkPromise = undefined; throw error; });
    return sdkPromise;
  }

  function withUser(userId, work) {
    return serialize(async () => {
      assertUser(userId);
      const { Purchases, LogLevel } = await sdk();
      assertUser(userId);
      if (!instance) {
        Purchases.setLogLevel(testMode ? LogLevel.Debug : LogLevel.Error);
        instance = Purchases.isConfigured()
          ? Purchases.getSharedInstance()
          : Purchases.configure({ apiKey, appUserId: userId });
      }
      if (instance.getAppUserId() !== userId) await instance.changeUser(userId);
      assertUser(userId);
      return work(instance, () => assertUser(userId));
    });
  }

  return {
    testMode,
    setUser(userId) {
      activeUserId = userId == null ? null : String(userId);
      if (activeUserId) return Promise.resolve();
      // Never instantiate a customer for a signed-out visitor.
      return serialize(async () => {
        if (!instance || activeUserId !== null) return;
        const { Purchases } = await sdk();
        await instance.changeUser(Purchases.generateRevenueCatAnonymousAppUserId());
      });
    },
    refresh(userId) {
      return withUser(userId, (purchases) => purchases.getCustomerInfo());
    },
    snapshot(userId) {
      return withUser(userId, async (purchases) => {
        const [info, offerings] = await Promise.allSettled([
          purchases.getCustomerInfo(), getOfferings(purchases),
        ]);
        if (info.status === "rejected") throw info.reason;
        return {
          customerInfo: info.value,
          offering: offerings.status === "fulfilled" ? offerings.value.current : null,
          offeringError: offerings.status === "rejected" ? offerings.reason : null,
        };
      });
    },
    checkout(userId, { paywall = true, customerEmail } = {}) {
      return withUser(userId, async (purchases, checkUser) => {
        const existing = await purchases.getCustomerInfo();
        if (hasPremium(existing)) return existing;
        const offering = (await getOfferings(purchases)).current;
        const pkg = monthlyPackage(offering);
        checkUser();
        const result = paywall
          ? await purchases.presentPaywall({ offering, customerEmail, onBack: (close) => close() })
          : await purchases.purchase({ rcPackage: pkg, customerEmail });
        // Use the purchase result immediately, even if a subsequent refresh is offline.
        return result.customerInfo;
      });
    },
    async errorMessage(error) {
      if (!error) return "Could not complete the subscription request. Please try again.";
      if (sdkPromise) {
        const { ErrorCode } = await sdkPromise.catch(() => ({}));
        if (ErrorCode && error.errorCode === ErrorCode.UserCancelledError) return "";
        if (ErrorCode && error.errorCode === ErrorCode.PaymentPendingError) return "Your payment is pending. Premium will unlock after approval.";
        if (ErrorCode && error.errorCode === ErrorCode.NetworkError) return "Could not connect to RevenueCat. Check your connection and try again.";
      }
      return error.message || "Could not complete the subscription request. Please try again.";
    },
  };
}
