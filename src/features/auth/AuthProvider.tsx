import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let resolved = false;

    // Belt-and-suspenders watchdog: if getSession() somehow still hangs
    // after the noLock change in supabase.ts (e.g. a future SDK upgrade
    // regresses, or a Supabase outage stalls the refresh), force the
    // loading state off so the user lands on /login instead of an
    // infinite skeleton. onAuthStateChange will fill the session in
    // later if the real call eventually resolves.
    const watchdog = setTimeout(() => {
      if (!mounted || resolved) return;
      resolved = true;
      setLoading(false);
    }, 4000);

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted || resolved) return;
      resolved = true;
      clearTimeout(watchdog);
      setSession(data.session);
      if (data.session?.user.id) {
        try {
          const p = await fetchProfile(data.session.user.id);
          if (mounted) setProfile(p);
        } catch {
          if (mounted) setProfile(null);
        }
      }
      if (mounted) setLoading(false);
    }).catch(() => {
      if (!mounted || resolved) return;
      resolved = true;
      clearTimeout(watchdog);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s?.user.id) {
        try {
          const p = await fetchProfile(s.user.id);
          setProfile(p);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(watchdog);
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signInMagicLink: async (email) => {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshProfile: async () => {
        if (!session?.user.id) return;
        try {
          const p = await fetchProfile(session.user.id);
          setProfile(p);
        } catch {
          setProfile(null);
        }
      },
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
