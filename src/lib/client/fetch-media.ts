import { ApiError, NETWORK_ERROR, errorFromResponse } from "@/lib/api-client";
import type { StreamRef } from "@/lib/media-types";

export interface FetchedMedia {
  blob: Blob;
  /** Container of the bytes, e.g. "mp4", or "ts" for classic HLS. */
  ext: string;
}

export interface FetchOptions {
  signal?: AbortSignal;
  /** Fraction done (0–1), or null while the total is unknown. */
  onProgress?: (fraction: number | null) => void;
}

/** One attempt's options: its own signal, and `beat` to call whenever bytes arrive. */
interface AttemptOptions extends FetchOptions {
  signal: AbortSignal;
  beat: () => void;
}

/** A connection that goes this long without sending a byte is given up on rather than waited for forever. */
const STALL_MS = 30_000;

class StalledError extends Error {}

/** CDN hosts that refused a direct read (no CORS) this session; later fetches go straight to the proxy. */
const corsBlocked = new Set<string>();
const hostOf = (url: string) => new URL(url).host;

/** Where to read a stream from, best first: the CDN itself, then our pass-through proxy. */
export function streamUrls(ref: StreamRef): { url: string; direct: boolean }[] {
  const proxy = { url: new URL(ref.proxy, window.location.origin).toString(), direct: false };
  return ref.url && !corsBlocked.has(hostOf(ref.url)) ? [{ url: ref.url, direct: true }, proxy] : [proxy];
}

/** Remembers that a CDN can't be read cross-origin. */
export function markCorsBlocked(url: string): void {
  corsBlocked.add(hostOf(url));
}

const isAbort = (err: unknown) => err instanceof DOMException && err.name === "AbortError";

class DirectHttpError extends Error {}

async function get(url: string, direct: boolean, signal?: AbortSignal, range?: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      headers: range ? { Range: range } : undefined,
      // CDNs may refuse a foreign Referer; the proxy is same-origin, so it doesn't matter there.
      referrerPolicy: direct ? "no-referrer" : "strict-origin-when-cross-origin",
      credentials: direct ? "omit" : "same-origin",
    });
  } catch (err) {
    if (isAbort(err) || direct) throw err;
    throw new ApiError("NETWORK", NETWORK_ERROR);
  }
  if (!response.ok) {
    if (direct) {
      await response.body?.cancel();
      throw new DirectHttpError(`HTTP ${response.status}`);
    }
    throw await errorFromResponse(response);
  }
  return response;
}

/** Reads a body into a Blob, folding chunks into Blob parts as it goes so the browser can page them out. */
async function readBody(response: Response, onBytes: (loaded: number, total: number | null) => void): Promise<Blob> {
  const total = Number(response.headers.get("content-length")) || null;
  const parts: Blob[] = [];
  let pending: Uint8Array<ArrayBuffer>[] = [];
  let pendingBytes = 0;
  let loaded = 0;
  const reader = response.body!.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    pending.push(value as Uint8Array<ArrayBuffer>);
    pendingBytes += value.length;
    loaded += value.length;
    if (pendingBytes >= 8 * 1024 * 1024) {
      parts.push(new Blob(pending));
      pending = [];
      pendingBytes = 0;
    }
    onBytes(loaded, total);
  }
  parts.push(new Blob(pending));
  return new Blob(parts, { type: response.headers.get("content-type")?.split(";")[0] ?? "" });
}

async function fetchFile(url: string, direct: boolean, { signal, onProgress, beat }: AttemptOptions): Promise<Blob> {
  const response = await get(url, direct, signal);
  return readBody(response, (loaded, total) => {
    beat();
    onProgress?.(total ? Math.min(1, loaded / total) : null);
  });
}

/** Runs one fetch attempt, aborting it if no bytes arrive for STALL_MS. */
async function guarded<T>(outer: AbortSignal | undefined, attempt: (signal: AbortSignal, beat: () => void) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const onAbort = () => controller.abort(outer?.reason);
  outer?.addEventListener("abort", onAbort, { once: true });
  let lastBeat = Date.now();
  let stalled = false;
  const timer = setInterval(() => {
    if (Date.now() - lastBeat < STALL_MS) return;
    stalled = true;
    controller.abort();
  }, 2_000);
  try {
    return await attempt(controller.signal, () => (lastBeat = Date.now()));
  } catch (err) {
    if (stalled && !outer?.aborted) throw new StalledError("no data for 30s");
    throw err;
  } finally {
    clearInterval(timer);
    outer?.removeEventListener("abort", onAbort);
  }
}

interface Segment {
  url: string;
  range?: string;
}

const SEGMENT_CONCURRENCY = 4;

function parseAttribute(line: string, name: string): string | undefined {
  const match = new RegExp(`[:,]${name}=(?:"([^"]*)"|([^,]*))`).exec(line);
  return match ? (match[1] ?? match[2]) : undefined;
}

/** Downloads every segment of an HLS stream (highest-bandwidth variant) and joins them. */
async function fetchHls(url: string, direct: boolean, { signal, onProgress, beat }: AttemptOptions): Promise<FetchedMedia> {
  const text = async (target: string) => {
    const body = await (await get(target, direct, signal)).text();
    beat();
    return body;
  };
  let playlistUrl = url;
  let playlist = await text(playlistUrl);

  if (playlist.includes("#EXT-X-STREAM-INF")) {
    const lines = playlist.split(/\r?\n/).map((line) => line.trim());
    let best: { uri: string; bandwidth: number } | null = null;
    for (const [i, line] of lines.entries()) {
      if (!line.startsWith("#EXT-X-STREAM-INF")) continue;
      const uri = lines.slice(i + 1).find((next) => next && !next.startsWith("#"));
      const bandwidth = Number(parseAttribute(line, "BANDWIDTH")) || 0;
      if (uri && (!best || bandwidth > best.bandwidth)) best = { uri, bandwidth };
    }
    if (!best) throw new ApiError("NO_MEDIA", "We couldn't find any downloadable video or audio in that link.");
    playlistUrl = new URL(best.uri, playlistUrl).toString();
    playlist = await text(playlistUrl);
  }

  let init: Segment | null = null;
  const segments: Segment[] = [];
  let range: string | undefined;
  let nextOffset = 0;
  for (const raw of playlist.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#EXT-X-KEY") && parseAttribute(line, "METHOD") !== "NONE") {
      throw new ApiError("DRM", "This content is encrypted, so it can't be downloaded.");
    }
    if (line.startsWith("#EXT-X-MAP")) {
      const uri = parseAttribute(line, "URI");
      if (uri) init = { url: new URL(uri, playlistUrl).toString() };
    } else if (line.startsWith("#EXT-X-BYTERANGE:")) {
      const [length, offset] = line.slice(17).split("@").map(Number);
      const start = Number.isFinite(offset) ? offset : nextOffset;
      range = `bytes=${start}-${start + length - 1}`;
      nextOffset = start + length;
    } else if (!line.startsWith("#")) {
      segments.push({ url: new URL(line, playlistUrl).toString(), range });
      range = undefined;
    }
  }
  if (segments.length === 0) throw new ApiError("NO_MEDIA", "We couldn't find any downloadable video or audio in that link.");

  const fetchSegment = async (segment: Segment) => readBody(await get(segment.url, direct, signal, segment.range), beat);
  const parts: Blob[] = new Array(segments.length);
  let done = 0;
  let next = 0;
  const initBlob = init ? await fetchSegment(init) : null;
  const worker = async () => {
    for (let i = next++; i < segments.length; i = next++) {
      parts[i] = await fetchSegment(segments[i]);
      done += 1;
      onProgress?.(done / segments.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(SEGMENT_CONCURRENCY, segments.length) }, worker));

  // fMP4 segments follow their init section; classic HLS is MPEG-TS, which concatenates as-is.
  return { blob: new Blob(initBlob ? [initBlob, ...parts] : parts), ext: initBlob ? "mp4" : "ts" };
}

/**
 * Downloads a stream into memory. Tries the platform's CDN directly and falls back
 * to the proxy when the browser isn't allowed to read it (CORS) or the CDN refuses.
 */
export async function fetchStream(ref: StreamRef, options: FetchOptions = {}): Promise<FetchedMedia> {
  const candidates = streamUrls(ref);
  for (const [index, { url, direct }] of candidates.entries()) {
    try {
      return await guarded(options.signal, async (signal, beat) => {
        const attempt = { ...options, signal, beat };
        if (ref.hls) return await fetchHls(url, direct, attempt);
        return { blob: await fetchFile(url, direct, attempt), ext: ref.ext };
      });
    } catch (err) {
      if (options.signal?.aborted || (isAbort(err) && !(err instanceof StalledError))) throw err;
      if (!direct || index === candidates.length - 1) {
        if (err instanceof StalledError) throw new ApiError("NETWORK", "The download stalled. Check your connection and try again.");
        throw err;
      }
      // A network-level failure on a reachable CDN is almost always CORS; a stall or HTTP error isn't.
      if (!(err instanceof DirectHttpError) && !(err instanceof StalledError)) markCorsBlocked(url);
      options.onProgress?.(0);
    }
  }
  throw new ApiError("NO_MEDIA", "We couldn't find any downloadable video or audio in that link.");
}
