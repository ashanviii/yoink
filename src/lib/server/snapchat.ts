import "server-only";

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

/** Points the extracted info at the watermark-free file when one exists. */
export async function cleanSnapchatFile(info: { url?: string | null; formats?: { url?: string | null }[] }): Promise<void> {
  const original = info.url;
  const clean = original ? cleanSnapchatMediaUrl(original) : null;
  if (!clean || !(await isVideo(clean))) return;
  info.url = clean;
  for (const format of info.formats ?? []) if (format.url === original) format.url = clean;
}
