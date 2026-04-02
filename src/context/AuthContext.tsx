'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase, type Profile } from '@/lib/supabase';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

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
  
  // Track if we have already handled the initial session to prevent double-firing
  const isInitialLoad = useRef(true);
  const profileFetchedForUser = useRef('');

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[Auth] Profile fetch error:', err);
      return null;
    }
  };

  const handleAuthChange = async (event: AuthChangeEvent, session: Session | null) => {
    console.log('[Auth] State Change:', event, session?.user?.id || 'No User');
    
    if (session?.user) {
      setUser(session.user);
      
      // Fetch profile if it's a new user or a relevant event
      if (profileFetchedForUser.current !== session.user.id || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        profileFetchedForUser.current = session.user.id;
        const prof = await fetchProfile(session.user.id);
        setProfile(prof);
      }
    } else {
      setUser(null);
      setProfile(null);
      profileFetchedForUser.current = '';
    }
    
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // Step 1: Subscribe to changes immediately so we don't miss anything during getSession
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
          if (mounted) handleAuthChange(event, session);
        });

        // Step 2: Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user && mounted && isInitialLoad.current) {
          isInitialLoad.current = false;
          await handleAuthChange('INITIAL_SESSION' as any, session);
        } else if (mounted) {
          setLoading(false);
        }

        return subscription;
      } catch (err) {
        console.error('[Auth] Initialization error:', err);
        if (mounted) setLoading(false);
        return null;
      }
    }

    const subPromise = initializeAuth();

    return () => {
      mounted = false;
      subPromise.then(sub => sub?.unsubscribe());
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    profileFetchedForUser.current = '';
    setLoading(false);
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
