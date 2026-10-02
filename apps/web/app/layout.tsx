import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { Providers } from "../components/providers";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "../lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Private by default: this is an authenticated app. Only the few public pages
  // that should be found (see INDEXABLE_PATHS) opt back in via publicPageMetadata.
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FinTrack",
  },
};

export const viewport: Viewport = {
  themeColor: "#2B2620",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Per-request CSP nonce set by middleware.ts. Reading request headers also
  // makes every page dynamic, which a nonce requires (a prerendered page
  // would ship scripts with a stale nonce).
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
