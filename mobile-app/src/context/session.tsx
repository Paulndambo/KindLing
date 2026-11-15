import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { DeviceEventEmitter } from 'react-native';

import { apiRequest, getStudentProfile, unregisterPushDevice, type StudentProfile, type StudentProfileInput, type UserSession } from '@/services/api';
import { getStoredPushToken } from '@/services/notifications';
import { deleteSecret, getSecret, setSecret } from '@/services/storage';

type SessionContextValue = {
  loading: boolean;
  session: UserSession | null;
  profile: StudentProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  finishOnboarding: (profile: StudentProfileInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<StudentProfile | null>;
};

const SESSION_KEY = 'kindling.session.v1';
const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<UserSession | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    const next = await getStudentProfile();
    setProfile(next);
    const saved = await getSecret(SESSION_KEY);
    if (saved) await setSecret(SESSION_KEY, JSON.stringify({ ...JSON.parse(saved), profile: next }));
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await getSecret(SESSION_KEY);
        if (!saved) return;
        const tokens = JSON.parse(saved) as { access?: string; refresh?: string; tokens?: { access?: string; refresh?: string }; user?: UserSession; profile?: StudentProfile | null };
        const access = tokens.access || tokens.tokens?.access;
        if (!access || !tokens.user) return;
        await setSecret('kindling.access-token', access);
        if (active) setSession(tokens.user);
        if (active && tokens.profile) setProfile(tokens.profile);
        try {
          const remoteProfile = await getStudentProfile();
          if (active) setProfile(remoteProfile);
          await setSecret(SESSION_KEY, JSON.stringify({ ...tokens, profile: remoteProfile }));
        } catch (cause) {
          if (cause instanceof Error && 'status' in cause && cause.status === 401) throw cause;
          if (active && !tokens.profile) setProfile(null);
        }
      } catch {
        await deleteSecret(SESSION_KEY);
        await deleteSecret('kindling.access-token');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('kindlingSessionExpired', () => {
      setSession(null);
      setProfile(null);
    });
    return () => subscription.remove();
  }, []);

  const acceptAuth = useCallback(async (payload: { user: UserSession; tokens: { access: string; refresh: string } }) => {
    const normalizedUser = { ...payload.user, name: payload.user.name || payload.user.email.split('@')[0] };
    await setSecret(SESSION_KEY, JSON.stringify({ ...payload, user: normalizedUser }));
    await setSecret('kindling.access-token', payload.tokens.access);
    setSession(normalizedUser);
    const nextProfile = await getStudentProfile();
    setProfile(nextProfile);
    await setSecret(SESSION_KEY, JSON.stringify({ ...payload, user: normalizedUser, profile: nextProfile }));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<{ user: UserSession; tokens: { access: string; refresh: string } }>('/api/auth/login/', {
      method: 'POST', auth: false, json: { email: email.trim(), password },
    });
    await acceptAuth(result);
  }, [acceptAuth]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await apiRequest<{ user: UserSession; tokens: { access: string; refresh: string } }>('/api/auth/register/', {
      method: 'POST', auth: false, json: { name: name.trim(), email: email.trim(), password, password_confirm: password },
    });
    await acceptAuth(result);
  }, [acceptAuth]);

  const finishOnboarding = useCallback(async (profileInput: StudentProfileInput) => {
    const saved = await apiRequest<StudentProfile>('/api/students/me/', {
      method: 'PUT', json: profileInput,
    });
    setProfile(saved);
    const stored = await getSecret(SESSION_KEY);
    if (stored) await setSecret(SESSION_KEY, JSON.stringify({ ...JSON.parse(stored), profile: saved }));
  }, []);

  const signOut = useCallback(async () => {
    try {
      const token = await getStoredPushToken();
      if (token) await unregisterPushDevice(token);
    } catch {
      // Ignore network error during sign out
    }
    await deleteSecret(SESSION_KEY);
    await deleteSecret('kindling.access-token');
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo(() => ({ loading, session, profile, signIn, register, finishOnboarding, signOut, refreshProfile }), [loading, session, profile, signIn, register, finishOnboarding, signOut, refreshProfile]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
