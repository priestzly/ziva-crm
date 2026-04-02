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
  
  // İşlem kilitleri — çift çağrıları ve race condition'ları engeller
  const initialized = useRef(false);
  const processing = useRef(false);
  const mounted = useRef(true);

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

  // Session'ı işle — processing kilidi ile çift çağrıları engelle
  const processSession = useCallback(async (session: Session | null) => {
    // Zaten işlem devam ediyorsa veya component unmount olduysa atla
    if (processing.current || !mounted.current) return;
    processing.current = true;

    try {
      if (session?.user) {
        const prof = await fetchProfile(session.user.id);
        if (!mounted.current) return;
        setUser(session.user);
        setProfile(prof);
      } else {
        setUser(null);
        setProfile(null);
      }
    } finally {
      processing.current = false;
      if (mounted.current) setLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    mounted.current = true;

    // 1. İlk oturumu hemen al — en hızlı yol
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted.current) return;
        await processSession(session);
      } catch {
        if (mounted.current) setLoading(false);
      }
      initialized.current = true;
    };

    init();

    // 2. Auth değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (!mounted.current) return;
        console.log('[Auth] Event:', event, session?.user?.email);

        // INITIAL_SESSION zaten getSession() ile ele alındı — atla
        if (event === 'INITIAL_SESSION') {
          initialized.current = true;
          return;
        }

        if (event === 'SIGNED_IN') {
          // Eğer zaten initialized ve user aynıysa tekrar işleme gerek yok
          if (initialized.current && user?.id === session?.user?.id) return;
          await processSession(session);
        } else if (event === 'SIGNED_OUT') {
          processing.current = false; // Kilidi aç
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          // Token yenilendiğinde sadece user'ı sessizce güncelle
          if (session?.user && mounted.current) {
            setUser(session.user);
          }
        }
      }
    );

    // Güvenlik timeout
    const timeout = setTimeout(() => {
      if (!initialized.current && mounted.current) {
        console.warn('[Auth] Timeout: Auth initialization took too long');
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [processSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      // Sign in öncesi initialized'ı sıfırla, yeni session'ı kabul etsin
      initialized.current = false;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return { error: null };
    } catch {
      return { error: 'Beklenmeyen bir hata oluştu' };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Auth] Sign out error:', err);
      setUser(null);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const prof = await fetchProfile(user.id);
      if (mounted.current) setProfile(prof);
    }
  }, [user, fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
