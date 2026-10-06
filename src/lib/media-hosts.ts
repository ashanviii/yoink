/**
 * Platform CDNs the browser may fetch media from directly. The CSP allows exactly
 * these, and the resolver only hands out direct URLs on them; anything else goes
 * through the same-origin /api/media proxy.
 */
export const DIRECT_MEDIA_HOSTS = ["cdninstagram.com", "fbcdn.net", "pinimg.com", "sc-cdn.net"] as const;

export function isDirectMediaUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return false;
    const host = url.hostname.toLowerCase();
    return DIRECT_MEDIA_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

/** CSP source list for the hosts above. */
export const DIRECT_MEDIA_CSP = DIRECT_MEDIA_HOSTS.map((domain) => `https://*.${domain}`).join(" ");
