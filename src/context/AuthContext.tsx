'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  const [sessionChecked, setSessionChecked] = useState(false);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.warn('Profile fetch error:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Profile catch error:', err);
      return null;
    }
  }, []);

  // Session'ı yükle ve state'i güncelle
  const loadSession = useCallback(async () => {
    if (sessionChecked) return; // Sadece bir kez çalıştır
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error:', error.message);
        setUser(null);
        setProfile(null);
        setLoading(false);
        setSessionChecked(true);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        const prof = await fetchProfile(session.user.id);
        setProfile(prof);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
      setSessionChecked(true);
    } catch (err) {
      console.error('Session load error:', err);
      setUser(null);
      setProfile(null);
      setLoading(false);
      setSessionChecked(true);
    }
  }, [fetchProfile, sessionChecked]);

  // Auth state değişikliklerini dinle
  useEffect(() => {
    // İlk yükleme
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        console.log('Auth event:', event, session?.user?.id);

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
          setSessionChecked(true);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser(session.user);
            const prof = await fetchProfile(session.user.id);
            setProfile(prof);
            setLoading(false);
            setSessionChecked(true);
          }
        } else if (event === 'INITIAL_SESSION') {
          // Initial session zaten loadSession ile kontrol edildi
          if (!sessionChecked) {
            if (session?.user) {
              setUser(session.user);
              const prof = await fetchProfile(session.user.id);
              setProfile(prof);
            }
            setLoading(false);
            setSessionChecked(true);
          }
        } else if (session?.user) {
          setUser(session.user);
          const prof = await fetchProfile(session.user.id);
          setProfile(prof);
          setLoading(false);
          setSessionChecked(true);
        } else if (!session) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          setSessionChecked(true);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadSession, fetchProfile, sessionChecked]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: error.message };
      }
      // Auth state değişikliği otomatik olarak onAuthStateChange tarafından yakalanacak
      return { error: null };
    } catch (err) {
      return { error: 'Beklenmeyen bir hata oluştu' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      // Login sayfasına yönlendirme component tarafından yapılmalı
    } catch (err) {
      console.error('Sign out error:', err);
    }
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
