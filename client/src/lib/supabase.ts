import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let singleton: SupabaseClient | null | undefined;

/** Returns null if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are not set. */
export function getSupabase(): SupabaseClient | null {
  if (singleton !== undefined) return singleton;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url?.trim() || !anon?.trim()) {
    singleton = null;
    return null;
  }
  singleton = createClient(url.trim(), anon.trim(), {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return singleton;
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}
