import "server-only";
import { config } from "./config";
import { ytdlp } from "./ytdlp";

/**
 * Snapchat's web player serves Spotlight's "share" rendition (variant 27), which has the
 * Snapchat logo and username burned in. Variant 1034 of the same media id is the clean encode.
 */
export function cleanSnapchatMediaUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !/(^|\.)sc-cdn\.net$/i.test(url.hostname)) return null;
    const cleanPath = url.pathname.replace(/\.27\.([A-Z0-9]+)$/i, ".1034.$1");
    return cleanPath === url.pathname ? null : `${url.origin}${cleanPath}`;
  } catch {
    return null;
  }
}

async function isVideo(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-0" }, signal: AbortSignal.timeout(10_000) });
    await res.body?.cancel();
    return res.ok && /^video\//i.test(res.headers.get("content-type") ?? "");
  } catch {
    return false;
  }
}

/** Direct URL of the watermark-free file, or the page URL when no clean variant exists. */
export async function snapchatDownloadSource(pageUrl: string): Promise<string> {
  const result = await ytdlp(["--dump-single-json", "--skip-download", "--no-playlist"], pageUrl, {
    timeoutMs: config.resolveTimeoutMs,
    maxStdoutBytes: 4 * 1024 * 1024,
  });
  if (result.code !== 0) return pageUrl;
  try {
    const info = JSON.parse(result.stdout) as { url?: string };
    const clean = info.url ? cleanSnapchatMediaUrl(info.url) : null;
    return clean && (await isVideo(clean)) ? clean : pageUrl;
  } catch {
    return pageUrl;
  }
}
