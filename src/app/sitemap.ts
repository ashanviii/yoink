import type { MetadataRoute } from "next";
import { LANDING_PAGES } from "@/lib/landing-pages";
import { absoluteUrl } from "@/lib/site";

const LAST_MODIFIED = new Date("2026-10-01");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), lastModified: LAST_MODIFIED, changeFrequency: "weekly", priority: 1 },
    ...LANDING_PAGES.map((page) => ({
      url: absoluteUrl(`/${page.slug}`),
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    { url: absoluteUrl("/download-videos-from-social-media"), lastModified: LAST_MODIFIED, changeFrequency: "monthly" as const, priority: 0.8 },
    ...["/terms", "/privacy", "/copyright"].map((path) => ({
      url: absoluteUrl(path),
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];
}
