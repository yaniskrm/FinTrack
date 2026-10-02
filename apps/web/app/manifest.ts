import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "../lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: "fr",
    categories: ["finance"],
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#2B2620",
    theme_color: "#2B2620",
    icons: [
      // Rounded mark, transparent corners — shown as-is.
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Full-bleed opaque square: the OS crops it to its own mask shape. Reusing
      // the rounded icon here would leave transparent corners inside the mask.
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
