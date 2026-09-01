import { useState, useCallback, useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { STORAGE_KEYS } from "../constants/onboarding";
import {
  loginWithPassword as apiLogin,
  registerAccount as apiRegister,
  fetchCurrentUser,
  logoutLocal,
  getStoredTokens,
  setStoredTokens,
  ApiError,
} from "../services/api";

function formatAuthFailure(err, fallback) {
  if (err instanceof ApiError) {
    const data = err.data;
    if (data && typeof data === "object") {
      if (typeof data.detail === "string" && data.detail.trim()) return data.detail;
      if (Array.isArray(data.detail) && data.detail[0]) return String(data.detail[0]);
      if (typeof data.non_field_errors?.[0] === "string") return data.non_field_errors[0];
      const first = Object.values(data).flat?.()?.[0];
      if (typeof first === "string" && first.trim()) return first;
    }
    if (err.message?.trim()) return err.message;
  }
  const raw = err?.message || "";
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return "Unable to reach Kindling. Check that the server is running and try again.";
  }
  if (raw.trim()) return raw;
  return fallback;
}

/**
 * Student authentication against the Kindling Django API.
 * Session (user + login flag) is cached in localStorage; JWT tokens live
 * under a dedicated key used by the API client.
 *
 * Flows:
 * - Log in → existing student account
 * - Get started → register account, then complete profile onboarding
 */
export function useAuth() {
  const [userSession, setUserSession] = useLocalStorage(
    STORAGE_KEYS.userSession,
    null
  );
  const [authOpen, setAuthOpen] = useState(false);
  /** @type {["login" | "register", Function]} */
  const [authMode, setAuthMode] = useState("login");
  const [pendingTab, setPendingTab] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [bootstrapping, setBootstrapping] = useState(() =>
    Boolean(getStoredTokens()?.access && userSession?.isLoggedIn)
  );

  const isLoggedIn = Boolean(userSession?.isLoggedIn && getStoredTokens()?.access);

  // Validate existing tokens on mount
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const tokens = getStoredTokens();
      if (!tokens?.access || !userSession?.isLoggedIn) {
        setBootstrapping(false);
        return;
      }
      try {
        const user = await fetchCurrentUser();
        if (cancelled) return;
        setUserSession((prev) => ({
          ...(prev || {}),
          id: user.id,
          email: user.email,
          name: user.name || prev?.name,
          isLoggedIn: true,
          tokens,
        }));
      } catch {
        if (cancelled) return;
        logoutLocal();
        setUserSession(null);
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySession = useCallback(
    (session) => {
      setUserSession(session);
      setAuthOpen(false);
      setAuthError("");
      return session;
    },
    [setUserSession]
  );

  const login = useCallback(
    async (email, password) => {
      setAuthLoading(true);
      setAuthError("");
      try {
        const session = await apiLogin(email, password);
        return applySession(session);
      } catch (err) {
        const message = formatAuthFailure(
          err,
          "Unable to log in. Check your email and password, then try again."
        );
        setAuthError(message);
        // Attach readable message so UI catch blocks can show it even if
        // parent state is cleared by a re-render race.
        if (err && typeof err === "object") err.message = message;
        throw err;
      } finally {
        setAuthLoading(false);
      }
    },
    [applySession]
  );

  const register = useCallback(
    async ({ email, password, passwordConfirm, name }) => {
      setAuthLoading(true);
      setAuthError("");
      try {
        const session = await apiRegister({
          email,
          password,
          passwordConfirm,
          name,
        });
        return applySession(session);
      } catch (err) {
        const message = formatAuthFailure(
          err,
          "Unable to create account. Please try again."
        );
        setAuthError(message);
        if (err && typeof err === "object") err.message = message;
        throw err;
      } finally {
        setAuthLoading(false);
      }
    },
    [applySession]
  );

  const logout = useCallback(() => {
    logoutLocal();
    setStoredTokens(null);
    setUserSession(null);
    setAuthError("");
  }, [setUserSession]);

  const openAuth = useCallback((mode = "login", tabId = null) => {
    setAuthMode(mode === "register" ? "register" : "login");
    setPendingTab(tabId);
    setAuthError("");
    setAuthOpen(true);
  }, []);

  const requireAuth = useCallback(
    (tabId, mode = "login") => {
      openAuth(mode, tabId);
    },
    [openAuth]
  );

  const clearPendingTab = useCallback(() => {
    setPendingTab(null);
  }, []);

  return {
    userSession,
    isLoggedIn,
    authOpen,
    setAuthOpen,
    authMode,
    setAuthMode,
    openAuth,
    pendingTab,
    setPendingTab,
    login,
    register,
    logout,
    requireAuth,
    clearPendingTab,
    authLoading,
    authError,
    setAuthError,
    bootstrapping,
  };
}
