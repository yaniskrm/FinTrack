import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@fintrack/api-client";

// `requireEnv("NAME")` (dynamic `process.env[name]`) only works where a real
// `process.env` object exists at runtime (Node/Edge). In the browser, Next.js
// inlines `NEXT_PUBLIC_*` vars by statically replacing the literal
// `process.env.NEXT_PUBLIC_X` expression at build time — a computed/dynamic
// access can never match that, so it silently evaluates to `undefined`
// client-side. This must reference each var by its literal dotted form.
function requirePublicEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Supabase client for use in Client Components.
 * Session is persisted via cookies (shared with the server client) so
 * RSC and the browser see the same auth state.
 */
export function createClient() {
  return createBrowserClient<Database>(
    requirePublicEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    requirePublicEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
