import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

let client = null;

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

/**
 * Raw REST details for requests that must survive page teardown. The JS client
 * cannot issue a keepalive fetch, and an ordinary insert started on pagehide is
 * cancelled with the page.
 */
export function getSupabaseRest() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
}
