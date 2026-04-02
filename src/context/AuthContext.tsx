'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      return data || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const prof = await fetchProfile(session.user.id);
          if (mounted) {
            setUser(session.user);
            setProfile(prof);
          }
        }
      } catch (err) {
        console.error('[Auth] Initial getSession failed', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    // İlk yükleme - timeout olmadan sabırla veriyi bekle
    initializeAuth();

    // Dinleyici - tab değiştirme vb. durumlar için
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Yeni giriş yapıldıysa profili al
        const prof = await fetchProfile(session.user.id);
        if (mounted) {
          setUser(session.user);
          setProfile(prof);
          setLoading(false);
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Sessizce user güncelle
        setUser(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) {
      const prof = await fetchProfile(user.id);
      setProfile(prof);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
