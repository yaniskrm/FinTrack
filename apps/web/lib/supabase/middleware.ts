import { createServerClient } from "@supabase/ssr";
import type { CookieMethodsServer, CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireEnv } from "../env";

// Routes that require an authenticated session.
const AUTH_REQUIRED_PREFIXES = ["/dashboard", "/settings", "/mfa", "/transactions", "/subscriptions"];
// Routes that additionally require a fully stepped-up (AAL2) session when the
// user has 2FA enabled. `/mfa` is deliberately excluded — it's where step-up
// happens, so it must stay reachable at AAL1. These are exactly the routes
// backed by tables with a RESTRICTIVE aal2 RLS policy (see
// 20260822000000_mfa_aal2_rls.sql) — without this gate, an AAL1 user with 2FA
// enabled would land on the page and silently see empty data instead of being
// routed through step-up.
const AAL2_GATED_PREFIXES = ["/dashboard", "/settings", "/transactions", "/subscriptions"];
// Routes that only make sense when logged out.
const LOGGED_OUT_ONLY_PREFIXES = ["/login", "/signup", "/forgot-password"];

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
      for (const { name, value } of cookiesToSet) {
        request.cookies.set(name, value);
      }
      response = NextResponse.next({ request });
      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options);
      }
    },
  };

  // Build a redirect that carries over any session cookies refreshed above,
  // so redirecting never drops a just-rotated token.
  function redirectTo(pathname: string): NextResponse {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  const supabase = createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { cookies: cookieMethods },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const needsAuth = AUTH_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAal2Gated = AAL2_GATED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isLoggedOutOnly = LOGGED_OUT_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const onMfaPage = pathname.startsWith("/mfa");

  if (!user && needsAuth) {
    return redirectTo("/login");
  }

  if (!user && pathname.startsWith("/reset-password")) {
    return redirectTo("/forgot-password");
  }

  if (user && (isAal2Gated || isLoggedOutOnly || onMfaPage)) {
    // Only compute the assurance level on auth-relevant routes to bound the
    // extra lookup — never on public pages like /privacy.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const stepUpPending = aal?.currentLevel === "aal1" && aal.nextLevel === "aal2";

    if (stepUpPending && isAal2Gated) {
      return redirectTo("/mfa");
    }

    if (!stepUpPending && onMfaPage) {
      return redirectTo("/dashboard");
    }

    if (isLoggedOutOnly) {
      return redirectTo(stepUpPending ? "/mfa" : "/dashboard");
    }
  }

  return response;
}
