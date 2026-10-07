import "server-only";
import { isIP } from "node:net";
import { AppError } from "@/lib/errors";
import { config } from "./config";
import { mediaProxyUrl, sealMediaToken, type MediaTokenPayload } from "./token";

/**
 * Fallback for CDNs the browser can't read directly (no CORS, or cookies a page
 * can't send). Bytes pass straight through: nothing is stored or processed here.
 */

const HEADERS_TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 3;
const MAX_PLAYLIST_BYTES = 2 * 1024 * 1024;
const RANGE = /^bytes=\d*-\d*$/;
const DROP_HEADERS = new Set(["host", "connection", "content-length", "accept-encoding", "range", "transfer-encoding"]);

function safeTarget(raw: string): URL {
  const url = new URL(raw);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (url.protocol !== "https:" || url.username || url.password || isIP(host) || host === "localhost" || !host.includes(".")) {
    throw new AppError("BAD_REQUEST", "Media host not allowed.");
  }
  return url;
}

function upstreamHeaders(payload: MediaTokenPayload, range: string | null): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(payload.h)) {
    if (/^[A-Za-z0-9-]+$/.test(name) && !/[\r\n]/.test(value) && !DROP_HEADERS.has(name.toLowerCase())) headers.set(name, value);
  }
  if (range) headers.set("Range", range);
  return headers;
}

function upstreamError(status: number): AppError {
  // Signed CDN URLs answer 403/404/410 once they lapse.
  if (status === 403 || status === 404 || status === 410) return new AppError("EXPIRED");
  if (status === 429) return new AppError("UPSTREAM_BLOCKED");
  if (status >= 500) return new AppError("UPSTREAM_TIMEOUT");
  return new AppError("NOT_FOUND");
}

/** Fetches with redirects followed by hand, so every hop is re-checked. */
async function fetchUpstream(payload: MediaTokenPayload, range: string | null, signal: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, HEADERS_TIMEOUT_MS);
  try {
    let target = safeTarget(payload.u);
    for (let hop = 0; ; hop++) {
      const response = await fetch(target, { headers: upstreamHeaders(payload, range), redirect: "manual", signal: controller.signal });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location && hop < MAX_REDIRECTS) {
        await response.body?.cancel();
        target = safeTarget(new URL(location, target).toString());
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw upstreamError(response.status);
      }
      return response;
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (signal.aborted) throw new AppError("BAD_REQUEST", "Request cancelled.");
    throw new AppError("UPSTREAM_TIMEOUT", undefined, { cause: err });
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

/** Points every URI in a playlist back at this proxy, so segments get the same headers. */
function rewritePlaylist(text: string, base: string, payload: MediaTokenPayload): string {
  const seal = (uri: string, playlist: boolean) =>
    mediaProxyUrl(sealMediaToken({ u: new URL(uri, base).toString(), h: payload.h, x: playlist }, payload.e));
  let nextIsPlaylist = false;
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        nextIsPlaylist = /^#EXT-X-STREAM-INF/i.test(trimmed);
        const playlistTag = /^#EXT-X-(MEDIA|I-FRAME-STREAM-INF)/i.test(trimmed);
        return line.replace(/URI="([^"]+)"/g, (_, uri: string) => `URI="${seal(uri, playlistTag)}"`);
      }
      const playlist = nextIsPlaylist || /\.m3u8?(\?|$)/i.test(new URL(trimmed, base).pathname);
      nextIsPlaylist = false;
      return seal(trimmed, playlist);
    })
    .join("\n");
}

const baseHeaders = {
  "Cache-Control": "private, max-age=600",
  "X-Content-Type-Options": "nosniff",
  // Only this site's pages may read or embed the stream.
  "Cross-Origin-Resource-Policy": "same-origin",
  "Content-Security-Policy": "default-src 'none'; sandbox",
};

/** Reports each chunk's size to `onBytes` as it streams to the client. */
function metered(body: ReadableStream<Uint8Array>, onBytes: (bytes: number) => void): ReadableStream<Uint8Array> {
  return body.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        onBytes(chunk.byteLength);
        controller.enqueue(chunk);
      },
    }),
  );
}

export async function proxyMedia(
  payload: MediaTokenPayload,
  request: Request,
  onBytes: (bytes: number) => void,
): Promise<Response> {
  const rawRange = request.headers.get("range");
  const range = !payload.x && rawRange && RANGE.test(rawRange) ? rawRange : null;
  const upstream = await fetchUpstream(payload, range, request.signal);

  if (payload.x) {
    const length = Number(upstream.headers.get("content-length") ?? 0);
    if (length > MAX_PLAYLIST_BYTES) throw new AppError("TOO_LARGE");
    const text = await upstream.text();
    onBytes(text.length);
    if (text.length > MAX_PLAYLIST_BYTES || !text.trimStart().startsWith("#EXTM3U")) throw new AppError("NO_MEDIA");
    return new Response(rewritePlaylist(text, upstream.url || payload.u, payload), {
      headers: { ...baseHeaders, "Content-Type": "application/vnd.apple.mpegurl" },
    });
  }

  // Content-Range total for partial responses, Content-Length otherwise.
  const total = Number(/\/(\d+)$/.exec(upstream.headers.get("content-range") ?? "")?.[1] ?? upstream.headers.get("content-length") ?? 0);
  if (total > config.maxFileSizeMb * 1024 * 1024) {
    await upstream.body?.cancel();
    throw new AppError("TOO_LARGE", `That file is bigger than our ${config.maxFileSizeMb} MB limit.`);
  }

  const headers: Record<string, string> = {
    ...baseHeaders,
    "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
    "Accept-Ranges": upstream.headers.get("accept-ranges") ?? "none",
  };
  // fetch() already decoded any Content-Encoding, so the upstream length would be wrong.
  const length = upstream.headers.get("content-length");
  if (length && !upstream.headers.get("content-encoding")) headers["Content-Length"] = length;
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers["Content-Range"] = contentRange;

  return new Response(upstream.body && metered(upstream.body, onBytes), { status: upstream.status === 206 ? 206 : 200, headers });
}
