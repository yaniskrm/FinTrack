import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { Providers } from "../components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinTrack",
  description: "Gestion financière personnelle — friction zéro, sécurité bancaire-grade.",
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
