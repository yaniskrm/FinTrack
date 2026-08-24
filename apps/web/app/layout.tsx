import type { Metadata, Viewport } from "next";
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
