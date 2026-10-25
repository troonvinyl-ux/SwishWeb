import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import {
  getSupabaseClientAsync,
  getSupabaseClient,
  resetClient,
  storeAnonKey,
} from '@/lib/supabase';

export type ConnectionStatus = 'initialising' | 'connected' | 'needs_key' | 'error';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  connectionStatus: ConnectionStatus;
  /** Last-resort manual key — only called from LoginPage when auto-init fails */
  setManualKey: (key: string) => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, niche: string) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [session, setSession]         = useState<Session | null>(null);
  const [loading, setLoading]         = useState(true);
  const [connectionStatus, setStatus] = useState<ConnectionStatus>('initialising');
  const unsubRef = useRef<(() => void) | null>(null);

  const attachAuthListener = useCallback(() => {
    // Clean up any existing subscription first
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }

    const sb = getSupabaseClient();
    if (!sb) return;

    // Load existing persisted session
    sb.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to future auth events
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    unsubRef.current = () => subscription.unsubscribe();
  }, []);

  // Auto-initialise on mount — never requires user interaction under normal conditions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = await getSupabaseClientAsync();
        if (cancelled) return;
        if (!sb) {
          // No key found after all resolution steps
          setStatus('needs_key');
          setLoading(false);
          return;
        }
        setStatus('connected');
        attachAuthListener();
      } catch {
        if (!cancelled) {
          setStatus('error');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [attachAuthListener]);

  /** Called only when auto-init fails and user provides key via LoginPage */
  const setManualKey = useCallback((key: string) => {
    storeAnonKey(key); // stores in localStorage + builds client
    setStatus('connected');
    setLoading(true);
    // Give the client a tick to register
    setTimeout(() => attachAuthListener(), 50);
  }, [attachAuthListener]);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const sb = getSupabaseClient() || await getSupabaseClientAsync();
    if (!sb) return { error: new Error('Backend not connected') };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, fullName: string, niche: string): Promise<{ error: Error | null; needsEmailConfirmation: boolean }> => {
    const sb = getSupabaseClient() || await getSupabaseClientAsync();
    if (!sb) return { error: new Error('Backend not connected'), needsEmailConfirmation: false };

    const { data, error } = await sb.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          preferred_niche: niche,
          onboarding_status: 'started',
          signup_source: 'swish_web',
        },
      },
    });
    return {
      error: error ? new Error(error.message) : null,
      needsEmailConfirmation: !error && !data.session,
    };
  };

  const signOut = async () => {
    // IMPORTANT: sign out does NOT destroy backend configuration.
    // We only end the user's session. The anon key remains in localStorage
    // so the next sign-in requires no manual key entry.
    const sb = getSupabaseClient();
    if (sb) await sb.auth.signOut();
    setUser(null);
    setSession(null);
    // Do NOT call resetClient() or clearStoredAnonKey() here.
    // The backend connection remains active; only the auth session is cleared.
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, connectionStatus, setManualKey, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
