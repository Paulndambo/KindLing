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
        const message =
          err instanceof ApiError
            ? err.message
            : "Unable to log in. Check your connection and try again.";
        setAuthError(message);
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
        let message = "Unable to create account.";
        if (err instanceof ApiError) {
          if (err.data && typeof err.data === "object") {
            const first = Object.values(err.data).flat?.()?.[0] || err.message;
            message = typeof first === "string" ? first : err.message;
          } else {
            message = err.message;
          }
        }
        setAuthError(message);
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
