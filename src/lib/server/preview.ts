import "server-only";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AppError } from "@/lib/errors";
import { PREVIEW_FRAME_WIDTH, PREVIEW_FRAMES } from "@/lib/media-types";
import { config } from "./config";
import { run } from "./process";
import { Semaphore } from "./semaphore";
import { ffmpegLocation } from "./ytdlp";

interface PreviewSource {
  url: string;
  headers: Record<string, string>;
  durationSec: number;
  expires: number;
  sprite?: Promise<Buffer>;
  /** Single preview frames keyed by tenth of a second. */
  stills?: Map<number, Promise<Buffer>>;
}

// Platform CDN URLs stay server-side; clients only ever see the random id.
// Must outlive cached resolve responses, which hand out the same id again.
const TTL_MS = Math.max(30 * 60_000, config.resolveCacheTtlMs + 5 * 60_000);
const MAX_ENTRIES = 2_000;
const MAX_STILLS_PER_SOURCE = 24;
const STILL_WIDTH = 480;
const globalForPreview = globalThis as unknown as { __yoinkPreviews?: Map<string, PreviewSource>; __yoinkPreviewSlots?: Semaphore };
const sources = (globalForPreview.__yoinkPreviews ??= new Map());
const slots = (globalForPreview.__yoinkPreviewSlots ??= new Semaphore(config.maxConcurrentResolves, config.maxQueuedResolves, config.resolveQueueWaitMs));

export function registerPreviewSource(url: string, headers: Record<string, string> | undefined, durationSec: number): string | null {
  if (!/^https:\/\//i.test(url) || !(durationSec > 0)) return null;
  if (sources.size >= MAX_ENTRIES) {
    for (const [key, entry] of sources) if (entry.expires <= Date.now()) sources.delete(key);
    if (sources.size >= MAX_ENTRIES) sources.delete(sources.keys().next().value!);
  }
  const id = randomBytes(16).toString("base64url");
  sources.set(id, { url, headers: headers ?? {}, durationSec, expires: Date.now() + TTL_MS });
  return id;
}

function headerArgs(headers: Record<string, string>): string[] {
  const blob = Object.entries(headers)
    .filter(([key, value]) => /^[A-Za-z0-9-]+$/.test(key) && !/[\r\n]/.test(value))
    .map(([key, value]) => `${key}: ${value}\r\n`)
    .join("");
  return blob ? ["-headers", blob] : [];
}

/**
 * Reads a video's length from its container header. Some extractors (Instagram)
 * don't report a duration, which would hide trim and frame extraction.
 */
export async function probeDuration(url: string, headers: Record<string, string> = {}): Promise<number | null> {
  const ffmpeg = ffmpegLocation();
  if (!ffmpeg || !/^https:\/\//i.test(url)) return null;
  try {
    // With no output ffmpeg prints the input's metadata and exits non-zero; we only want the text.
    const result = await run(
      ffmpeg,
      ["-hide_banner", "-protocol_whitelist", "https,http,tls,tcp,crypto,hls", ...headerArgs(headers), "-i", url],
      { timeoutMs: 15_000, maxStdoutBytes: 64 * 1024 },
    );
    const match = /Duration: (\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(result.stderr);
    if (!match) return null;
    const sec = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    return sec > 0 ? sec : null;
  } catch {
    return null;
  }
}

/** Runs ffmpeg against the remote stream and returns the single JPEG it writes. */
async function renderJpeg(source: PreviewSource, inputArgs: string[], outputArgs: string[]): Promise<Buffer> {
  const ffmpeg = ffmpegLocation();
  if (!ffmpeg) throw new AppError("INTERNAL", "ffmpeg not found");

  const dir = await mkdtemp(path.join(config.tmpDir ?? tmpdir(), "yoink-preview-"));
  const out = path.join(dir, "preview.jpg");
  try {
    const result = await run(
      ffmpeg,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        // Only network protocols: an HLS playlist must never pull in local files.
        "-protocol_whitelist",
        "https,http,tls,tcp,crypto,hls",
        ...headerArgs(source.headers),
        ...inputArgs,
        "-i",
        source.url,
        "-an",
        ...outputArgs,
        "-frames:v",
        "1",
        "-y",
        out,
      ],
      { timeoutMs: 30_000 },
    );
    const image = result.code === 0 ? await readFile(out).catch(() => null) : null;
    if (!image?.length) throw new AppError("NOT_FOUND", "Preview unavailable.");
    return image;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function renderSprite(source: PreviewSource): Promise<Buffer> {
  return renderJpeg(
    source,
    // Long videos: keyframes only (~10x cheaper). Short clips may have just one keyframe.
    source.durationSec > 60 ? ["-skip_frame", "nokey"] : [],
    [
      "-vf",
      // tpad repeats the last frame so the tile always fills, even if the final keyframe lands early.
      `tpad=stop_mode=clone:stop_duration=${source.durationSec.toFixed(3)},fps=${PREVIEW_FRAMES}/${source.durationSec.toFixed(3)},scale=${PREVIEW_FRAME_WIDTH}:-2,tile=${PREVIEW_FRAMES}x1`,
      "-q:v",
      "5",
    ],
  );
}

function lookup(id: string): PreviewSource {
  const source = /^[A-Za-z0-9_-]{16,32}$/.test(id) ? sources.get(id) : undefined;
  if (!source || source.expires <= Date.now()) throw new AppError("NOT_FOUND", "Preview expired — fetch the link again.");
  return source;
}

export function getPreviewSprite(id: string): Promise<Buffer> {
  const source = lookup(id);
  source.sprite ??= slots.run(() => renderSprite(source)).catch((err) => {
    source.sprite = undefined;
    throw err;
  });
  return source.sprite;
}

/** One exact frame (decoded up to `sec`, not snapped to a keyframe) for the frame picker. */
export function getPreviewStill(id: string, sec: number): Promise<Buffer> {
  const source = lookup(id);
  if (!Number.isFinite(sec) || sec < 0 || sec > source.durationSec) throw new AppError("BAD_REQUEST", "That moment is outside the video.");
  const key = Math.round(sec * 10);
  const stills = (source.stills ??= new Map());
  let still = stills.get(key);
  if (!still) {
    if (stills.size >= MAX_STILLS_PER_SOURCE) stills.delete(stills.keys().next().value!);
    // The last instant of a video often has no frame left to decode; back off slightly.
    const at = Math.max(0, Math.min(key / 10, source.durationSec - 0.1));
    still = slots
      .run(() => renderJpeg(source, ["-ss", at.toFixed(3)], ["-vf", `scale=${STILL_WIDTH}:-2`, "-q:v", "4"]))
      .catch((err) => {
        stills.delete(key);
        throw err;
      });
    stills.set(key, still);
  }
  return still;
}
