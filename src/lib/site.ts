export const site = {
  name: "yoink",
  tagline: "Save reels, snaps & vids in max quality",
  description:
    "yoink is a free, fast video downloader for Instagram Reels & Stories, TikTok (no watermark), Facebook videos & Reels, Snapchat Spotlight and Pinterest. Paste a link, trim if you like, download.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
} as const;

export function absoluteUrl(path = "/"): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
