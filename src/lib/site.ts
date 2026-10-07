export const site = {
  name: "Yoinkit",
  tagline: "Save reels, snaps & vids in max quality",
  description:
    "Yoinkit is a free, fast video downloader for Instagram Reels & Stories, TikTok (no watermark), Facebook videos & Reels, Snapchat Spotlight and Pinterest. Paste a link, trim if you like, download.",
  email: "ashanviy@gmail.com",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
} as const;

export function absoluteUrl(path = "/"): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
