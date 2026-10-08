import "server-only";
import { AppError } from "@/lib/errors";
import { isDirectMediaUrl } from "@/lib/media-hosts";
import type { MediaItem, MediaOption, OutputMode, ResolveResponse, StreamRef } from "@/lib/media-types";
import type { ParsedMediaUrl } from "@/lib/url";
import { config } from "./config";
import { probeDuration, probeReachable } from "./probe";
import { cleanSnapchatFile } from "./snapchat";
import { mediaProxyUrl, sealMediaToken } from "./token";
import { classifyFailure, ytdlp } from "./ytdlp";
import { Semaphore } from "./semaphore";
import { thumbnailProxyUrl } from "./thumbnails";

/** The subset of yt-dlp's info JSON we rely on. */
interface RawFormat {
  format_id: string;
  ext?: string;
  vcodec?: string | null;
  acodec?: string | null;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  tbr?: number | null;
  abr?: number | null;
  filesize?: number | null;
  filesize_approx?: number | null;
  format_note?: string | null;
  protocol?: string | null;
  has_drm?: boolean | null;
  url?: string | null;
  http_headers?: Record<string, string> | null;
  /** Cookies the CDN expects, as yt-dlp prints them ("name=value; Domain=…; Path=/"). */
  cookies?: string | null;
  fragments?: unknown[] | null;
}

interface RawInfo {
  _type?: "video" | "playlist" | "url";
  id: string;
  url?: string | null;
  ext?: string | null;
  vcodec?: string | null;
  acodec?: string | null;
  http_headers?: Record<string, string> | null;
  cookies?: string | null;
  webpage_url?: string | null;
  title?: string | null;
  description?: string | null;
  uploader?: string | null;
  channel?: string | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  thumbnail?: string | null;
  is_live?: boolean | null;
  live_status?: string | null;
  formats?: RawFormat[];
  entries?: (RawInfo | null)[];
}

const MAX_VIDEO_OPTIONS = 6;
const MAX_CAROUSEL_ITEMS = 20;

const isSet = (codec: string | null | undefined): codec is string => !!codec && codec !== "none";
const isHls = (format: RawFormat) => /^m3u8/.test(format.protocol ?? "");

/**
 * Some extractors (e.g. Snapchat Spotlight) return one direct file with no `formats`
 * list and blank codec info; treat it as a single format of unknown codecs.
 */
function formatsOf(info: RawInfo): RawFormat[] {
  if (info.formats?.length) return info.formats;
  if (!info.url) return [];
  return [
    {
      format_id: "0",
      ext: info.ext ?? undefined,
      vcodec: info.vcodec ?? "unknown",
      acodec: info.acodec ?? "unknown",
      width: info.width || null,
      height: info.height || null,
      url: info.url,
      http_headers: info.http_headers,
      cookies: info.cookies,
    },
  ];
}

function usable(format: RawFormat): boolean {
  if (format.has_drm) return false;
  // The browser fetches whole files and HLS playlists; segmented DASH and other protocols aren't offered.
  if (!format.url || format.fragments?.length) return false;
  if (format.protocol && !/^(https?|m3u8|m3u8_native)$/.test(format.protocol)) return false;
  if (format.ext === "mhtml" || format.protocol === "mhtml") return false; // storyboards
  if (format.vcodec === "images") return false;
  // TikTok exposes a watermarked "download" rendition; never offer it.
  if (format.format_note && /watermark/i.test(format.format_note)) return false;
  return true;
}

function codecRank(vcodec: string | null | undefined): number {
  // Prefer the most widely playable codec at a given resolution.
  if (!vcodec) return 1;
  if (/^(avc|h264)/i.test(vcodec)) return 3;
  if (/^(vp0?9|hevc|hvc|h265)/i.test(vcodec)) return 2;
  return 1; // av01 and anything exotic
}

function codecName(vcodec: string | null | undefined): string | null {
  if (!vcodec) return null;
  if (/^(avc|h264)/i.test(vcodec)) return "H.264";
  if (/^(hevc|hvc|h265)/i.test(vcodec)) return "HEVC";
  if (/^vp0?9/i.test(vcodec)) return "VP9";
  if (/^av01/i.test(vcodec)) return "AV1";
  return null;
}

function formatSize(format: RawFormat, duration: number | null): { bytes: number | null; estimate: boolean } {
  if (format.filesize) return { bytes: format.filesize, estimate: false };
  if (format.filesize_approx) return { bytes: format.filesize_approx, estimate: true };
  if (format.tbr && duration) return { bytes: Math.round((format.tbr * 1000 * duration) / 8), estimate: true };
  return { bytes: null, estimate: true };
}

/** Facebook prefixes titles with engagement counts: "9.8K views · 341 reactions | Actual title". */
function cleanTitle(title: string | null | undefined): string | null {
  const cleaned = title?.replace(/^[\d.,]+[KMB]?\s+(views?|reactions?|plays?)\b[^|]*\|\s*/i, "").trim();
  return cleaned || null;
}

function slugify(text: string): string {
  return (
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "media"
  );
}

const COOKIE_ATTRIBUTES = /^(domain|path|expires|max-age|secure|httponly|samesite|priority|partitioned)$/i;

/**
 * yt-dlp's cookie dump → a Cookie request header. Values arrive in Set-Cookie form, where a
 * value may be wrapped in double quotes (TikTok's tt_chain_token). yt-dlp's own cookie jar
 * sends those unquoted, and TikTok's CDN answers 403 to the quoted form, so strip them.
 */
function cookieHeader(raw: string | null | undefined): string | null {
  const pairs = (raw ?? "")
    .split(/;\s*/)
    .filter((part) => part.includes("=") && !COOKIE_ATTRIBUTES.test(part.split("=")[0].trim()))
    .map((part) => part.replace(/^([^=]+)="(.*)"$/, "$1=$2"));
  return pairs.length ? pairs.join("; ") : null;
}

/** Headers (cookies included) the CDN expects for this format. */
function requestHeaders(format: RawFormat, info: RawInfo): Record<string, string> {
  const headers: Record<string, string> = { ...info.http_headers, ...format.http_headers };
  const cookie = cookieHeader(format.cookies ?? info.cookies) ?? headers.Cookie;
  delete headers.Cookie;
  if (cookie) headers.Cookie = cookie;
  return headers;
}

/**
 * What the browser needs to fetch one format: the CDN URL when a plain browser
 * request can get it, and a sealed proxy URL carrying the headers for when it can't.
 */
function streamRef(format: RawFormat, info: RawInfo): StreamRef {
  const url = format.url!;
  const headers = requestHeaders(format, info);
  const hls = isHls(format);
  return {
    url: !headers.Cookie && isDirectMediaUrl(url) ? url : null,
    proxy: mediaProxyUrl(sealMediaToken({ u: url, h: headers, x: hls })),
    hls,
    ext: format.ext ?? "mp4",
  };
}

interface BuildContext {
  parsed: ParsedMediaUrl;
  uploader: string | null;
}

function buildOptions(info: RawInfo, ctx: BuildContext): MediaOption[] {
  const formats = formatsOf(info).filter(usable);
  const duration = info.duration ?? null;
  // Untitled posts get titles like "TikTok video #<id>"; don't repeat the id after them.
  const titleSlug = slugify(cleanTitle(info.title) ?? ctx.parsed.platform);
  const fileStem = (titleSlug.includes(info.id.toLowerCase()) ? titleSlug : `${titleSlug}-${info.id}`).slice(0, 110);

  const refs = new Map<RawFormat, StreamRef>();
  const ref = (format: RawFormat) => refs.get(format) ?? refs.set(format, streamRef(format, info)).get(format)!;
  const recipe = (streams: RawFormat[], mode: OutputMode, label: string) => ({
    streams: streams.map(ref),
    mode,
    stem: fileStem,
    label: label === "audio" || label === "best" ? "" : label,
    durationSec: duration,
    meta: {
      title: cleanTitle(info.title),
      artist: info.uploader ?? info.channel ?? ctx.uploader,
      url: info.webpage_url ?? ctx.parsed.url,
    },
  });

  const audioOnly = formats
    .filter((f) => isSet(f.acodec) && f.vcodec === "none")
    .sort((a, b) => Number(b.ext === "m4a") - Number(a.ext === "m4a") || (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0));
  const bestAudio = audioOnly[0];
  const anyAudio = !!bestAudio || formats.some((f) => isSet(f.acodec));

  // Pick the best video rendition per resolution.
  const byResolution = new Map<number, RawFormat>();
  for (const format of formats) {
    if (!isSet(format.vcodec) || !format.height) continue;
    const current = byResolution.get(format.height);
    const better =
      !current ||
      codecRank(format.vcodec) > codecRank(current.vcodec) ||
      (codecRank(format.vcodec) === codecRank(current.vcodec) &&
        // At equal codec, prefer formats that already carry audio, then whole files
        // (the browser can save those as-is), then bitrate.
        (Number(isSet(format.acodec)) - Number(isSet(current.acodec)) ||
          Number(isHls(current)) - Number(isHls(format)) ||
          (format.tbr ?? 0) - (current.tbr ?? 0)) > 0);
    if (better) byResolution.set(format.height, format);
  }

  const options: MediaOption[] = [];
  const seenLabels = new Set<string>();
  const heights = [...byResolution.keys()].sort((a, b) => b - a);

  for (const height of heights) {
    if (options.length >= MAX_VIDEO_OPTIONS) break;
    const video = byResolution.get(height)!;
    const shortSide = video.width ? Math.min(video.width, height) : height;
    const label = `${shortSide}p`;
    if (seenLabels.has(label)) continue;
    seenLabels.add(label);

    const streams = isSet(video.acodec) || !bestAudio ? [video] : [video, bestAudio];

    const videoSize = formatSize(video, duration);
    const audioSize = !isSet(video.acodec) && bestAudio ? formatSize(bestAudio, duration) : { bytes: 0, estimate: false };
    const sizeBytes = videoSize.bytes !== null && audioSize.bytes !== null ? videoSize.bytes + audioSize.bytes : null;
    // Don't offer what the download step would reject anyway.
    if (sizeBytes !== null && sizeBytes > config.maxFileSizeMb * 1024 * 1024) continue;

    const badges: string[] = [];
    if (shortSide >= 2160) badges.push("4K");
    else if (shortSide >= 1440) badges.push("2K");
    else if (shortSide >= 1080) badges.push("Full HD");
    else if (shortSide >= 720) badges.push("HD");
    if (video.fps && video.fps >= 50) badges.push(`${Math.round(video.fps)}fps`);
    if (!anyAudio) badges.push("No audio");

    options.push({
      recipe: recipe(streams, "video", label),
      kind: "video",
      label,
      detail: ["MP4", codecName(video.vcodec)].filter(Boolean).join(" · "),
      ext: "mp4",
      sizeBytes,
      sizeIsEstimate: videoSize.estimate || audioSize.estimate,
      badges,
      best: options.length === 0,
    });
  }

  // yt-dlp lists formats worst to best.
  const withVideo = formats.filter((f) => f.vcodec !== "none");
  const bestFile = withVideo.filter((f) => f.acodec !== "none").at(-1) ?? formats.filter((f) => isSet(f.acodec)).at(-1);

  // Some extractors (e.g. Instagram progressive files) don't report dimensions.
  if (options.length === 0 && withVideo.length > 0) {
    const best = withVideo.at(-1)!;
    options.push({
      recipe: recipe(best.acodec === "none" && bestAudio ? [best, bestAudio] : [best], "video", "best"),
      kind: "video",
      label: "Best quality",
      detail: "MP4",
      ext: "mp4",
      sizeBytes: null,
      sizeIsEstimate: true,
      badges: info.height ? [`${Math.min(info.width ?? info.height, info.height)}p`] : [],
      best: true,
    });
  }

  const audioSource = bestAudio ?? bestFile;
  if (anyAudio && audioSource) {
    options.push({
      recipe: recipe([audioSource], "audio-mp3", "audio"),
      kind: "audio",
      label: "MP3",
      detail: "Audio only · best quality",
      ext: "mp3",
      // V0 VBR output tracks the source bitrate closely; fall back to a typical 192kbps.
      sizeBytes: duration ? Math.round((Math.min(bestAudio?.abr ?? 192, 260) * 1000 * duration) / 8) : null,
      sizeIsEstimate: true,
      badges: [],
      best: true,
    });
    if (bestAudio?.ext === "m4a") {
      const size = formatSize(bestAudio, duration);
      options.push({
        recipe: recipe([bestAudio], "audio-m4a", "audio"),
        kind: "audio",
        label: "M4A",
        detail: `Original audio${bestAudio.abr ? ` · ${Math.round(bestAudio.abr)}kbps` : ""}`,
        ext: "m4a",
        sizeBytes: size.bytes,
        sizeIsEstimate: size.estimate,
        badges: ["No re-encode"],
        best: false,
      });
    }
  }

  return options;
}

function assertDownloadable(info: RawInfo): void {
  if (info.is_live || info.live_status === "is_live" || info.live_status === "is_upcoming") {
    throw new AppError("LIVE");
  }
  if (info.duration && info.duration > config.maxDurationSec) {
    throw new AppError(
      "TOO_LONG",
      `That video is longer than our ${Math.round(config.maxDurationSec / 60)}-minute limit.`,
    );
  }
}

/**
 * Smallest stream that still makes a legible filmstrip (≥240p when available). The
 * browser draws it with a <video> element, so prefer what it can seek and decode
 * everywhere: plain files over HLS, H.264 over other codecs.
 */
function pickPreviewFormat(info: RawInfo): RawFormat | undefined {
  const candidates = formatsOf(info)
    .filter((f) => usable(f) && isSet(f.vcodec))
    .sort((a, b) => (a.height ?? 9999) - (b.height ?? 9999));
  const group =
    [candidates.filter((f) => !isHls(f) && codecRank(f.vcodec) === 3), candidates.filter((f) => !isHls(f)), candidates].find(
      (g) => g.length > 0,
    ) ?? [];
  return group.find((f) => (f.height ?? 0) >= 240) ?? group[0];
}

function previewSource(info: RawInfo): StreamRef | null {
  if (!info.duration) return null;
  const pick = pickPreviewFormat(info);
  return pick ? streamRef(pick, info) : null;
}

/**
 * The preview stream is often video-only (Instagram and Facebook split DASH audio out), so
 * playing it would be silent. When the post has sound, play the smallest whole file that
 * carries it instead: known video+audio renditions first, then files whose codecs yt-dlp
 * couldn't read, which on those platforms are the muxed progressive downloads.
 */
function pickPlaybackFormat(info: RawInfo): RawFormat | undefined {
  const preview = pickPreviewFormat(info);
  const formats = formatsOf(info);
  if ((preview && isSet(preview.acodec)) || !formats.some((f) => isSet(f.acodec))) return preview;
  const files = formats.filter((f) => usable(f) && !isHls(f) && f.vcodec !== "none");
  const muxed = files
    .filter((f) => isSet(f.vcodec) && isSet(f.acodec))
    .sort((a, b) => codecRank(b.vcodec) - codecRank(a.vcodec) || (a.height ?? 9999) - (b.height ?? 9999));
  // yt-dlp lists formats worst to best, so the first unknown one is the smallest.
  return muxed.find((f) => (f.height ?? 0) >= 240) ?? muxed[0] ?? files.find((f) => f.acodec == null) ?? preview;
}

function playbackSource(info: RawInfo): StreamRef | null {
  const pick = pickPlaybackFormat(info);
  return pick ? streamRef(pick, info) : null;
}

const MAX_PARALLEL_PROBES = 3;

/**
 * Instagram reports no duration; read it from each stream's header so trim and
 * frames still work. A carousel can have 20 videos, so probe a few at a time.
 */
async function fillDurations(entries: (RawInfo | null)[]): Promise<void> {
  const pending = entries.filter((entry): entry is RawInfo => !!entry && !entry.duration && !entry.is_live);
  const next = async (): Promise<void> => {
    for (let info = pending.shift(); info; info = pending.shift()) {
      const pick = pickPreviewFormat(info);
      if (!pick) continue;
      const probed = await probeDuration(pick.url!, requestHeaders(pick, info), isHls(pick));
      if (probed) info.duration = probed;
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL_PROBES, pending.length) }, next));
}

/**
 * TikTok's audio-only format is the post's "sound", which can be a whole song rather than
 * the clip's audio, so only renditions carrying both video and audio are kept (audio
 * downloads are then cut from the video file). yt-dlp also flags some
 * renditions (notably bytevc1/HEVC) as "needs testing" because their URLs often 404, but
 * only tests them when it downloads — and --dump-single-json strips the flag. The browser
 * fetches these URLs itself, so test them here.
 */
async function pruneTikTokFormats(entries: (RawInfo | null)[]): Promise<void> {
  await Promise.all(
    entries.map(async (info) => {
      if (!info?.formats?.length) return;
      const candidates = info.formats.filter((f) => usable(f) && isSet(f.vcodec) && isSet(f.acodec));
      const alive = await Promise.all(candidates.map((f) => probeReachable(f.url!, requestHeaders(f, info))));
      info.formats = candidates.filter((_, i) => alive[i]);
    }),
  );
}

function toItem(info: RawInfo, ctx: BuildContext): MediaItem | null {
  assertDownloadable(info);
  const options = buildOptions(info, ctx);
  if (options.length === 0) return null;
  return {
    id: info.id,
    title: cleanTitle(info.title) ?? "Untitled",
    thumbnail: thumbnailProxyUrl(info.thumbnail),
    preview: previewSource(info),
    playback: playbackSource(info),
    durationSec: info.duration ?? null,
    width: info.width || null,
    height: info.height || null,
    options,
  };
}

// --- tiny TTL cache so double-taps and page refreshes don't re-hit the platform ---
interface CacheEntry {
  value: ResolveResponse;
  expires: number;
}
const globalForCache = globalThis as unknown as { __yoinkResolveCache?: Map<string, CacheEntry> };
const cache = (globalForCache.__yoinkResolveCache ??= new Map());
const inflight = new Map<string, Promise<ResolveResponse>>();
const globalForLimit = globalThis as unknown as { __yoinkResolveSlots?: Semaphore };
export const resolveSlots = (globalForLimit.__yoinkResolveSlots ??= new Semaphore(
  config.maxConcurrentResolves,
  config.maxQueuedResolves,
  config.resolveQueueWaitMs,
));

export async function resolveMedia(parsed: ParsedMediaUrl): Promise<ResolveResponse> {
  const hit = cache.get(parsed.url);
  if (hit && hit.expires > Date.now()) return hit.value;

  const existing = inflight.get(parsed.url);
  if (existing) return existing;

  const promise = fetchInfo(parsed).finally(() => inflight.delete(parsed.url));
  inflight.set(parsed.url, promise);
  const value = await promise;

  if (cache.size > 500) {
    for (const [key, entry] of cache) if (entry.expires <= Date.now()) cache.delete(key);
    if (cache.size > 500) cache.clear();
  }
  if (config.resolveCacheTtlMs > 0) {
    cache.set(parsed.url, { value, expires: Date.now() + config.resolveCacheTtlMs });
  }
  return value;
}

async function fetchInfo(parsed: ParsedMediaUrl): Promise<ResolveResponse> {
  const allowCarousel = parsed.platform === "instagram";
  const args = [
    "--dump-single-json",
    "--skip-download",
    ...(allowCarousel ? ["--yes-playlist", "--playlist-items", `1:${MAX_CAROUSEL_ITEMS}`] : ["--no-playlist"]),
  ];

  // Identical links share one in-flight request (see resolveMedia), so a viral
  // link costs one yt-dlp run; the semaphore bounds how many distinct links run at once.
  const result = await resolveSlots.run(() =>
    ytdlp(args, parsed.url, { timeoutMs: config.resolveTimeoutMs, maxStdoutBytes: 32 * 1024 * 1024 }),
  );
  if (result.code !== 0) throw classifyFailure(result);

  let info: RawInfo;
  try {
    info = JSON.parse(result.stdout) as RawInfo;
  } catch (cause) {
    throw new AppError("INTERNAL", undefined, { cause });
  }

  const isPlaylist = info._type === "playlist";
  const entries = isPlaylist ? (info.entries ?? []) : [info];
  if (parsed.platform === "snapchat") await Promise.all(entries.map((entry) => entry && cleanSnapchatFile(entry)));
  if (parsed.platform === "tiktok") await pruneTikTokFormats(entries);
  await fillDurations(entries);

  const uploader = info.uploader ?? info.channel ?? null;
  const items: MediaItem[] = [];
  for (const entry of entries) {
    if (!entry) continue;
    const item = toItem(entry, { parsed, uploader });
    if (item) items.push(item);
  }

  if (items.length === 0) throw new AppError("NO_MEDIA");

  return {
    platform: parsed.platform,
    kind: parsed.kind,
    sourceUrl: parsed.url,
    title: cleanTitle(info.title) ?? items[0].title,
    uploader,
    items,
  };
}
