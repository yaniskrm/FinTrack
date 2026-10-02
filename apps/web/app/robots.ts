import type { MetadataRoute } from "next";
import { DISALLOWED_PATHS, siteUrl } from "../lib/seo";

// The authenticated app is behind a login (crawlers only ever see a redirect to
// /login) and is also `noindex`; this file just keeps well-behaved bots out of it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/og"], disallow: [...DISALLOWED_PATHS] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
