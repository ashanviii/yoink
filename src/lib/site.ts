export const site = {
  name: "Yoinkit",
  tagline: "Yoink exactly the part you want",
  description:
    "Free video downloader and editor for Instagram, TikTok, Facebook, Snapchat and Pinterest. Trim, crop and save just the part you want as MP4, GIF or MP3.",
  email: "ashanviy@gmail.com",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
} as const;

export function absoluteUrl(path = "/"): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
