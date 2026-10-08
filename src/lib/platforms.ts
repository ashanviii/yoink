export type PlatformId = "instagram" | "tiktok" | "pinterest" | "facebook" | "snapchat";

export type ContentKind = "reel" | "post" | "story" | "video" | "pin";

export interface Platform {
  id: PlatformId;
  name: string;
  /** Hostnames (exact or as a parent domain) accepted for this platform. */
  hosts: readonly string[];
  /** Whether downloads are re-encoded/selected to avoid watermarks. */
  watermarkFree: boolean;
}

export const PLATFORMS: Record<PlatformId, Platform> = {
  instagram: {
    id: "instagram",
    name: "Instagram",
    hosts: ["instagram.com", "instagr.am"],
    watermarkFree: true,
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    hosts: ["tiktok.com"],
    watermarkFree: true,
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    hosts: ["facebook.com", "fb.watch", "fb.com"],
    watermarkFree: true,
  },
  snapchat: {
    id: "snapchat",
    name: "Snapchat",
    hosts: ["snapchat.com"],
    watermarkFree: true,
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    hosts: [
      "pinterest.com",
      "pin.it",
      "pinterest.co.uk",
      "pinterest.ca",
      "pinterest.com.au",
      "pinterest.de",
      "pinterest.fr",
      "pinterest.es",
      "pinterest.it",
      "pinterest.pt",
      "pinterest.ch",
      "pinterest.at",
      "pinterest.nz",
      "pinterest.se",
      "pinterest.dk",
      "pinterest.ie",
      "pinterest.jp",
      "pinterest.cl",
      "pinterest.ph",
      "pinterest.com.mx",
      "pinterest.co.kr",
      "pinterest.in",
    ],
    watermarkFree: true,
  },
};
