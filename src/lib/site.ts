export const site = {
  name: "yoink",
  tagline: "Save reels, shorts & vids in max quality",
  description:
    "yoink is a free, fast media downloader for Instagram Reels & Stories, YouTube videos & MP3, TikTok (no watermark) and Pinterest videos. Paste a link, pick a quality, done.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "legal@example.com",
} as const;

export function absoluteUrl(path = "/"): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
