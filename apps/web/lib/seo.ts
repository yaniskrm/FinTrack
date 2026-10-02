import type { Metadata } from "next";

export const SITE_NAME = "FinTrack";
export const SITE_DESCRIPTION = "Gestion financière personnelle — friction zéro, sécurité bancaire-grade.";

/**
 * Canonical origin of the site. Same variable as the auth e-mail links and the
 * Open Banking redirect URL; the fallback only matters for builds where it is
 * not set (local, CI) and for nothing security-relevant.
 */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://fintrackapp.fr";
}

/**
 * Public pages that search engines may index. Everything else — the whole
 * authenticated app, login/signup, MFA — is `noindex` by default (see the root
 * layout) and absent from the sitemap. Legal pages join this list in the legal lot.
 */
export const INDEXABLE_PATHS = ["/privacy"] as const;

/** Paths robots.txt asks crawlers to stay out of: the authenticated app and auth plumbing. */
export const DISALLOWED_PATHS = [
  "/dashboard",
  "/transactions",
  "/subscriptions",
  "/budget",
  "/goals",
  "/investments",
  "/settings",
  "/mfa",
  "/reset-password",
  "/auth/",
] as const;

interface PublicPageOptions {
  /** Page title WITHOUT the site name — the root layout's template appends it. */
  title: string;
  description: string;
  path: string;
  /** Only pages listed in INDEXABLE_PATHS should pass true. */
  indexable?: boolean;
}

/**
 * Metadata for a page reachable while logged out: title, description, canonical
 * URL and the Open Graph / Twitter card (so a shared link previews properly).
 * Authenticated pages deliberately do NOT use this — no social card, no indexing.
 */
export function publicPageMetadata({ title, description, path, indexable = false }: PublicPageOptions): Metadata {
  const fullTitle = `${title} · ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "fr_FR",
      title: fullTitle,
      description,
      url: path,
      images: [{ url: "/og", width: 1200, height: 630, alt: "FinTrack — gestion financière personnelle" }],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: ["/og"] },
  };
}
