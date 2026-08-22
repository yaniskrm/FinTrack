import { createServerClient } from "@supabase/ssr";
import type { CookieMethodsServer, CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireEnv } from "../env";

const PROTECTED_PREFIXES = ["/dashboard"];
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

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const supabase = createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { cookies: cookieMethods },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isLoggedOutOnly = LOGGED_OUT_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!user && pathname.startsWith("/reset-password")) {
    const url = request.nextUrl.clone();
    url.pathname = "/forgot-password";
    return NextResponse.redirect(url);
  }

  if (user && isLoggedOutOnly) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
