import type { MetadataRoute } from "next";
import { INDEXABLE_PATHS, siteUrl } from "../lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return INDEXABLE_PATHS.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "yearly",
    priority: 0.3,
  }));
}
