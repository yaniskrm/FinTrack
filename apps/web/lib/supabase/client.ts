import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@fintrack/api-client";
import { requireEnv } from "../env";

/**
 * Supabase client for use in Client Components.
 * Session is persisted via cookies (shared with the server client) so
 * RSC and the browser see the same auth state.
 */
export function createClient() {
  return createBrowserClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
