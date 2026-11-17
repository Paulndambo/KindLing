import { useCallback, useEffect, useRef, useState } from "react";
import { revenueCat } from "../services/revenuecat";
import { hasPremium, managementUrl, monthlyPackage } from "../services/revenuecat-client";

export function useRevenueCat({ userSession, isLoggedIn, bootstrapping }) {
  const userId = !bootstrapping && isLoggedIn && userSession?.id != null ? String(userSession.id) : null;
  const customerEmail = userSession?.email;
  const [state, setState] = useState(null);
  const [failure, setFailure] = useState(null);
  const [operation, setOperation] = useState(null);
  const checkoutLocked = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const snapshot = await revenueCat.snapshot(userId);
      setState({ userId, ...snapshot });
      setFailure(snapshot.offeringError ? { userId, message: await revenueCat.errorMessage(snapshot.offeringError) } : null);
      return snapshot.customerInfo;
    } catch (error) {
      setFailure({ userId, message: await revenueCat.errorMessage(error) });
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    void revenueCat.setUser(userId).then(() => {
      if (active && userId) void refresh();
    }).catch(async (error) => {
      if (active) setFailure({ userId, message: await revenueCat.errorMessage(error) });
    });
    return () => { active = false; };
  }, [userId, refresh]);

  useEffect(() => {
    if (!userId) return;
    const onReturn = () => { if (document.visibilityState !== "hidden") void refresh(); };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [userId, refresh]);

  const checkout = useCallback(async (paywall = true) => {
    if (!userId) throw new Error("Sign in to subscribe to Premium.");
    if (checkoutLocked.current) return null;
    checkoutLocked.current = true;
    setOperation({ userId });
    try {
      const customerInfo = await revenueCat.checkout(userId, { paywall, customerEmail });
      setState((previous) => ({ ...(previous?.userId === userId ? previous : {}), userId, customerInfo }));
      setFailure(null);
      return customerInfo;
    } catch (error) {
      const message = await revenueCat.errorMessage(error);
      setFailure({ userId, message });
      return null;
    } finally {
      checkoutLocked.current = false;
      setOperation(null);
    }
  }, [userId, customerEmail]);

  const current = userId && state?.userId === userId ? state : null;
  let monthly = null;
  try { monthly = monthlyPackage(current?.offering); } catch { /* The paywall action reports unavailable packages. */ }
  return {
    customerInfo: current?.customerInfo ?? null,
    monthly,
    ready: !!current?.customerInfo,
    isPremium: hasPremium(current?.customerInfo),
    managementURL: managementUrl(current?.customerInfo),
    error: failure?.userId === userId ? failure.message : "",
    busy: !!userId && operation?.userId === userId,
    signedIn: !!userId,
    testMode: revenueCat.testMode,
    refresh,
    presentPaywall: () => checkout(true),
    purchaseMonthly: () => checkout(false),
  };
}
