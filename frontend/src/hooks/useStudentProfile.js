import { useState, useCallback, useEffect, useRef } from "react";
import { useLocalStorage } from "./useLocalStorage";
import {
  EMPTY_STUDENT_PROFILE,
  STORAGE_KEYS,
} from "../constants/onboarding";
import {
  getStudentProfile,
  saveStudentProfile,
  ApiError,
} from "../services/api";

/**
 * Student profile + onboarding for the logged-in student account.
 * Profile loads/saves against /api/students/me/ when authenticated.
 * Logged-out users have no profile until they Get Started (register).
 */
export function useStudentProfile({
  isLoggedIn = false,
  accountName = "",
} = {}) {
  const [student, setStudent] = useLocalStorage(
    STORAGE_KEYS.studentProfile,
    null
  );
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const lastFetchKey = useRef(null);

  const loadRemoteProfile = useCallback(async () => {
    if (!isLoggedIn) return null;
    setProfileLoading(true);
    setProfileError("");
    try {
      const remote = await getStudentProfile();
      if (remote) {
        setStudent(remote);
        if (!remote.isOnboarded) {
          setOnboardingOpen(true);
        }
        return remote;
      }
      // Account exists but no profile yet — start onboarding (prefill name from account)
      setStudent({
        ...EMPTY_STUDENT_PROFILE,
        name: accountName || "",
      });
      setOnboardingOpen(true);
      return null;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not load student profile.";
      setProfileError(message);
      console.warn("Student profile load failed:", err);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [isLoggedIn, accountName, setStudent]);

  // Fetch profile whenever login state becomes true
  useEffect(() => {
    if (!isLoggedIn) {
      lastFetchKey.current = null;
      return;
    }
    const key = "logged-in";
    if (lastFetchKey.current === key) return;
    lastFetchKey.current = key;
    loadRemoteProfile();
  }, [isLoggedIn, loadRemoteProfile]);

  // Clear remote-shaped profile when logged out
  useEffect(() => {
    if (!isLoggedIn) {
      setOnboardingOpen(false);
    }
  }, [isLoggedIn]);

  const saveProfile = useCallback(
    async (newProfile) => {
      if (!isLoggedIn) {
        const err = new Error("Create an account or log in to save your profile.");
        setProfileError(err.message);
        throw err;
      }

      setProfileError("");
      const payload = {
        ...newProfile,
        isOnboarded: true,
      };

      setProfileSaving(true);
      try {
        const saved = await saveStudentProfile(payload);
        setStudent(saved);
        setOnboardingOpen(false);
        return saved;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Could not save student profile. Please try again.";
        setProfileError(message);
        // Keep local draft so the user does not lose form data
        setStudent(payload);
        throw err;
      } finally {
        setProfileSaving(false);
      }
    },
    [isLoggedIn, setStudent]
  );

  const clearLocalProfile = useCallback(() => {
    setStudent(null);
    setOnboardingOpen(false);
    setProfileError("");
    lastFetchKey.current = null;
  }, [setStudent]);

  /** Merge a partial/full profile response (e.g. after PATCH digest prefs). */
  const applyProfileUpdate = useCallback(
    (partial) => {
      if (!partial || typeof partial !== "object") return;
      setStudent((prev) => ({ ...(prev || {}), ...partial }));
    },
    [setStudent]
  );

  return {
    // Never surface a cached profile while logged out
    student: isLoggedIn ? student : null,
    onboardingOpen,
    setOnboardingOpen,
    saveProfile,
    profileLoading,
    profileSaving,
    profileError,
    setProfileError,
    refreshProfile: loadRemoteProfile,
    applyProfileUpdate,
    clearLocalProfile,
  };
}
