import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Check your .env environment variables.");
}

/**
 * Custom Storage to bypass the problematic Web Lock API in backgrounded tabs.
 * This fixes the error: "Lock ... was not released within 5000ms"
 */
const customStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },
};

/**
 * Enhanced Supabase Client for Ziva CRM
 * Uses a singleton pattern to ensure consistent Auth and Realtime sessions across the App Router.
 */
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: customStorage, // Fixes Lock errors
        flowType: 'pkce'
      },
      global: {
        headers: { 'x-application-name': 'ziva-crm' }
      },
      realtime: {
        params: {
          events_per_second: 10
        }
      }
    });
  }
  return supabaseInstance;
}

// Export default instance for convenience
export const supabase = getSupabaseClient();

// Database types (Keep existing types for TS safety)
export type Mall = {
  id: string;
  name: string;
  address: string | null;
  contact_person: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  role: 'admin' | 'client';
  mall_id: string | null;
  business_id: string | null;
  full_name: string | null;
  created_at: string;
};

export type Business = {
  id: string;
  mall_id: string;
  name: string;
  category: string | null;
  created_at: string;
};

export type MaintenanceRecord = {
  id: string;
  business_id: string;
  admin_id: string | null;
  description: string;
  service_type: string | null;
  created_at: string;
  businesses?: Business;
};

export type MaintenancePhoto = {
  id: string;
  record_id: string;
  photo_url: string;
  created_at: string;
};