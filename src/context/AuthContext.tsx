'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, type Profile } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('[Auth] Profile fetch error:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[Auth] Profile fetch failed:', err);
      return null;
    }
  }, []);

  // Kullanıcı ve profili set et — tek bir yerden yapılır
  const setSession = useCallback(async (session: Session | null) => {
    if (session?.user) {
      setUser(session.user);
      const prof = await fetchProfile(session.user.id);
      setProfile(prof);
    } else {
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
  }, [fetchProfile]);

  useEffect(() => {
    // onAuthStateChange TÜM auth eventlerini yakalar
    // İlk mount'ta INITIAL_SESSION event'i otomatik gelir
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        console.log('[Auth] Event:', event, session?.user?.email);

        if (event === 'INITIAL_SESSION') {
          // İlk yükleme — session varsa profili çek
          await setSession(session);
          initialized.current = true;
        } else if (event === 'SIGNED_IN') {
          await setSession(session);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          // Token yenilendiğinde sadece user'ı güncelle, profili tekrar çekme
          if (session?.user) {
            setUser(session.user);
          }
        }
      }
    );

    // Güvenlik: 5 saniye içinde INITIAL_SESSION gelmezse loading'i kapat
    const timeout = setTimeout(() => {
      if (!initialized.current) {
        console.warn('[Auth] Timeout: INITIAL_SESSION did not fire in 5s');
        setLoading(false);
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [setSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: error.message };
      }
      // onAuthStateChange -> SIGNED_IN event profili otomatik çekecek
      return { error: null };
    } catch (err) {
      return { error: 'Beklenmeyen bir hata oluştu' };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      // onAuthStateChange -> SIGNED_OUT event state'i temizleyecek
    } catch (err) {
      console.error('[Auth] Sign out error:', err);
      // Logout'ta hata olsa bile state'i temizle
      setUser(null);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const prof = await fetchProfile(user.id);
      setProfile(prof);
    }
  }, [user, fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
