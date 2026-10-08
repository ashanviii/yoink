import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

type ManifestWithShareTarget = MetadataRoute.Manifest & {
  share_target: { action: string; method: "GET"; params: Record<string, string> };
};

export default function manifest(): ManifestWithShareTarget {
  return {
    name: `${site.name} — video downloader & editor`,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0f",
    theme_color: "#a78bfa",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    // Lets Android users "Share → Yoinkit" straight from Instagram/TikTok/Facebook.
    share_target: {
      action: "/",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}
