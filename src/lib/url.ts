import { PLATFORMS, type ContentKind, type PlatformId } from "./platforms";

export interface ParsedMediaUrl {
  platform: PlatformId;
  kind: ContentKind;
  /** Canonical URL handed to the extractor (tracking params stripped). */
  url: string;
}

export type UrlParseResult =
  | { ok: true; value: ParsedMediaUrl }
  | { ok: false; reason: "empty" | "invalid" | "unsupported-site" | "unsupported-content" };

const MAX_INPUT_LENGTH = 2048;
const URL_IN_TEXT = /https?:\/\/[^\s<>"'`]+/i;
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const IG_CODE = /^[A-Za-z0-9_-]{5,64}$/;
const NUMERIC_ID = /^\d{5,25}$/;
const SHORT_CODE = /^[A-Za-z0-9_-]{4,32}$/;

function hostMatches(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function detectPlatform(hostname: string): PlatformId | null {
  for (const platform of Object.values(PLATFORMS)) {
    if (platform.hosts.some((domain) => hostMatches(hostname, domain))) {
      return platform.id;
    }
  }
  return null;
}

/**
 * Pulls the first URL out of whatever the user pasted ("omg look https://…"),
 * adds a scheme when missing and returns a parsed URL or null.
 */
export function extractUrl(input: string): URL | null {
  const text = input.trim().slice(0, MAX_INPUT_LENGTH);
  if (!text) return null;

  const fromText = text.match(URL_IN_TEXT)?.[0];
  let candidate = fromText ?? text.split(/\s+/)[0];
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  // Trailing punctuation from chat apps is never part of these URLs.
  candidate = candidate.replace(/[),.!?]+$/, "");

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    if (url.port && url.port !== "443" && url.port !== "80") return null;
    if (!url.hostname.includes(".")) return null;
    return url;
  } catch {
    return null;
  }
}

function segments(url: URL): string[] {
  return url.pathname.split("/").filter(Boolean);
}

function parseYouTube(url: URL): ParsedMediaUrl | null {
  const host = url.hostname;
  const parts = segments(url);
  let id: string | null = null;
  let kind: ContentKind = "video";

  if (hostMatches(host, "youtu.be")) {
    id = parts[0] ?? null;
  } else if (parts[0] === "watch") {
    id = url.searchParams.get("v");
  } else if (parts[0] === "shorts") {
    id = parts[1] ?? null;
    kind = "short";
  } else if (["embed", "v", "live", "e"].includes(parts[0] ?? "")) {
    id = parts[1] ?? null;
  }

  if (!id || !YT_ID.test(id)) return null;
  const canonical =
    kind === "short" ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`;
  return { platform: "youtube", kind, url: canonical };
}

function parseInstagram(url: URL): ParsedMediaUrl | null {
  const parts = segments(url);
  // instagram.com/<user>/reel/<code> is an alternate share format.
  const offset = parts.length >= 3 && ["reel", "p", "tv"].includes(parts[1]) ? 1 : 0;
  const type = parts[offset];
  const code = parts[offset + 1];

  if ((type === "reel" || type === "reels") && code && IG_CODE.test(code)) {
    return { platform: "instagram", kind: "reel", url: `https://www.instagram.com/reel/${code}/` };
  }
  if ((type === "p" || type === "tv") && code && IG_CODE.test(code)) {
    return { platform: "instagram", kind: "post", url: `https://www.instagram.com/p/${code}/` };
  }
  if (type === "stories") {
    const [, user, storyId] = parts;
    if (user === "highlights" && storyId && NUMERIC_ID.test(storyId)) {
      return { platform: "instagram", kind: "story", url: `https://www.instagram.com/stories/highlights/${storyId}/` };
    }
    if (user && /^[A-Za-z0-9._]{1,30}$/.test(user)) {
      const suffix = storyId && NUMERIC_ID.test(storyId) ? `${storyId}/` : "";
      return { platform: "instagram", kind: "story", url: `https://www.instagram.com/stories/${user}/${suffix}` };
    }
  }
  return null;
}

function parseTikTok(url: URL): ParsedMediaUrl | null {
  const host = url.hostname;
  const parts = segments(url);

  // Short share links (vm.tiktok.com/XXXX, www.tiktok.com/t/XXXX) are resolved by the extractor.
  if ((hostMatches(host, "vm.tiktok.com") || hostMatches(host, "vt.tiktok.com")) && parts[0] && SHORT_CODE.test(parts[0])) {
    return { platform: "tiktok", kind: "video", url: `https://${host}/${parts[0]}/` };
  }
  if (parts[0] === "t" && parts[1] && SHORT_CODE.test(parts[1])) {
    return { platform: "tiktok", kind: "video", url: `https://www.tiktok.com/t/${parts[1]}/` };
  }

  const userIdx = parts.findIndex((p) => p.startsWith("@"));
  if (userIdx >= 0 && parts[userIdx + 1] === "video") {
    const id = parts[userIdx + 2];
    if (id && NUMERIC_ID.test(id)) {
      return { platform: "tiktok", kind: "video", url: `https://www.tiktok.com/${parts[userIdx]}/video/${id}` };
    }
  }
  if (parts[0] === "v" && parts[1]) {
    const id = parts[1].replace(/\.html$/, "");
    if (NUMERIC_ID.test(id)) return { platform: "tiktok", kind: "video", url: `https://www.tiktok.com/@_/video/${id}` };
  }
  return null;
}

function parsePinterest(url: URL): ParsedMediaUrl | null {
  const host = url.hostname;
  const parts = segments(url);

  if (hostMatches(host, "pin.it") && parts[0] && SHORT_CODE.test(parts[0])) {
    return { platform: "pinterest", kind: "pin", url: `https://pin.it/${parts[0]}` };
  }
  if (parts[0] === "pin" && parts[1]) {
    // Pins can be "123456" or "some-title--123456".
    const id = parts[1].split("--").pop() ?? "";
    if (NUMERIC_ID.test(id) || /^[A-Za-z0-9_-]{10,40}$/.test(id)) {
      return { platform: "pinterest", kind: "pin", url: `https://www.pinterest.com/pin/${id}/` };
    }
  }
  return null;
}

const PARSERS: Record<PlatformId, (url: URL) => ParsedMediaUrl | null> = {
  youtube: parseYouTube,
  instagram: parseInstagram,
  tiktok: parseTikTok,
  pinterest: parsePinterest,
};

export function parseMediaUrl(input: string): UrlParseResult {
  if (!input || !input.trim()) return { ok: false, reason: "empty" };
  const url = extractUrl(input);
  if (!url) return { ok: false, reason: "invalid" };

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  url.hostname = hostname;
  const platform = detectPlatform(hostname);
  if (!platform) return { ok: false, reason: "unsupported-site" };

  const parsed = PARSERS[platform](url);
  if (!parsed) return { ok: false, reason: "unsupported-content" };
  return { ok: true, value: parsed };
}

export const URL_ERROR_MESSAGES: Record<Exclude<UrlParseResult, { ok: true }>["reason"], string> = {
  empty: "Paste a link first ✌️",
  invalid: "That doesn't look like a link. Double-check and try again.",
  "unsupported-site": "We only support Instagram, YouTube, TikTok and Pinterest links (for now).",
  "unsupported-content":
    "We recognise the site, but not this kind of link. Try a direct link to a reel, post, story, video, short or pin.",
};
