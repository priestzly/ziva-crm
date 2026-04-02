import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Check your .env environment variables.");
}

// Create a singleton Supabase client for browser use
// This client automatically syncs auth state with cookies
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

// Export default instance for convenience
export const supabase = getSupabaseClient();

// Database types
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