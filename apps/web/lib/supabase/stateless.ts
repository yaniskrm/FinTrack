import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@fintrack/api-client";
import { requireEnv } from "../env";

/**
 * A Supabase client that neither reads nor writes any session cookie.
 *
 * Use it to verify a password WITHOUT touching the caller's real session:
 * `signInWithPassword` on the cookie-backed client replaces the session with a
 * fresh one, and for a user with 2FA that fresh session is only aal1 — which
 * would silently demote an aal2 session in the middle of a sensitive action.
 */
export function createStatelessClient() {
  return createSupabaseClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
