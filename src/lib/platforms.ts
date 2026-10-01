export type PlatformId = "instagram" | "youtube" | "tiktok" | "pinterest";

export type ContentKind = "reel" | "post" | "story" | "video" | "short" | "pin";

export interface Platform {
  id: PlatformId;
  name: string;
  /** Hostnames (exact or as a parent domain) accepted for this platform. */
  hosts: readonly string[];
  /** Brand-ish accent used for small UI touches (badges, focus rings). */
  accent: string;
  /** Whether downloads are re-encoded/selected to avoid watermarks. */
  watermarkFree: boolean;
}

export const PLATFORMS: Record<PlatformId, Platform> = {
  instagram: {
    id: "instagram",
    name: "Instagram",
    hosts: ["instagram.com", "instagr.am"],
    accent: "#ff3d8b",
    watermarkFree: true,
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    hosts: ["youtube.com", "youtu.be", "youtube-nocookie.com"],
    accent: "#ff3b30",
    watermarkFree: true,
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    hosts: ["tiktok.com"],
    accent: "#25f4ee",
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
    accent: "#e60023",
    watermarkFree: true,
  },
};

export const PLATFORM_LIST: readonly Platform[] = Object.values(PLATFORMS);

export function isPlatformId(value: unknown): value is PlatformId {
  return typeof value === "string" && value in PLATFORMS;
}
