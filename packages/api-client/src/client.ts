import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";

export type FinTrackClient = SupabaseClient<Database>;

/**
 * Creates a typed Supabase client.
 * Call this once at app startup and share the instance.
 *
 * Credentials come from environment variables — NEVER hardcode them.
 * On mobile, use expo-constants to read EXPO_PUBLIC_* vars.
 */
export function createFinTrackClient(supabaseUrl: string, supabaseAnonKey: string): FinTrackClient {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // mobile — no browser URL
    },
  });
}
