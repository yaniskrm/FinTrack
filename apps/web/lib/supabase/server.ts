import { createServerClient } from "@supabase/ssr";
import type { CookieMethodsServer, CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@fintrack/api-client";
import { requireEnv } from "../env.js";

/**
 * Supabase client for use in Server Components, Route Handlers and Server Actions.
 * Must be created per-request — cookies() is request-scoped.
 */
export async function createClient() {
  const cookieStore = await cookies();

  // Typed explicitly as `CookieMethodsServer` so TS resolves the non-deprecated
  // `createServerClient` overload instead of the legacy get/set/remove one.
  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
      // Called from a Server Component without a response object — the
      // middleware refreshes the session, so a no-op here is safe as
      // long as the auth middleware (added in Phase 1) is in place.
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // Ignored when called from a Server Component (see comment above).
      }
    },
  };

  // False positive below: we pass only getAll/setAll (no get/set/remove), but the rule
  // still flags the overloaded `createServerClient` signature as deprecated.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  return createServerClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { cookies: cookieMethods },
  );
}
