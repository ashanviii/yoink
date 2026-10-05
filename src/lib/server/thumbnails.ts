import "server-only";

/**
 * Thumbnails are proxied because Instagram/TikTok CDNs send
 * Cross-Origin-Resource-Policy headers that block hotlinking. The proxy only
 * ever fetches from these CDN domains (no SSRF into anything else).
 */
const ALLOWED_THUMB_HOSTS = [
  "sc-cdn.net",
  "cdninstagram.com",
  "fbcdn.net",
  "pinimg.com",
  "tiktokcdn.com",
  "tiktokcdn-us.com",
  "tiktokcdn-eu.com",
  "ibytedtos.com",
  "byteoversea.com",
  "muscdn.com",
] as const;

export function isAllowedThumbnailUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password || (url.port && url.port !== "443")) return null;
    const host = url.hostname.toLowerCase();
    return ALLOWED_THUMB_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`)) ? url : null;
  } catch {
    return null;
  }
}

export function thumbnailProxyUrl(raw: string | null | undefined): string | null {
  if (!raw || !isAllowedThumbnailUrl(raw)) return null;
  return `/api/thumb?u=${encodeURIComponent(raw)}`;
}
