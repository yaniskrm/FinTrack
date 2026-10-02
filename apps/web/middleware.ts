import { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { buildContentSecurityPolicy, cspHeaderName } from "./lib/security/csp";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Fresh, unguessable nonce per request. Forwarded to the app on the request
  // (`x-nonce`, read by the root layout for next-themes) and, as the CSP
  // header, on the request too: Next.js reads the nonce out of it to tag its
  // own inline scripts.
  const nonce = btoa(crypto.randomUUID());
  const headerName = cspHeaderName();
  const policy = buildContentSecurityPolicy({
    nonce,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    isDev: process.env.NODE_ENV !== "production",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(headerName, policy);

  const response = await updateSession(new NextRequest(request, { headers: requestHeaders }));
  response.headers.set(headerName, policy);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
