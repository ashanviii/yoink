import type { Metadata } from "next";
import { site } from "./site";

const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "Yoinkit media downloader" };

/**
 * Per-page metadata. A page-level `openGraph` object replaces the root one wholesale, so
 * this re-attaches the site name, locale and shared image, and sets `og:url` to the page itself.
 */
export function pageMetadata(opts: { title: string; description: string; path: string; keywords?: string[] }): Metadata {
  const { title, description, path, keywords } = opts;
  return {
    title,
    description,
    keywords,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: site.name, locale: "en_US", url: path, title, description, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}
