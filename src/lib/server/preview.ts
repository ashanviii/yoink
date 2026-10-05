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
}

// Platform CDN URLs stay server-side; clients only ever see the random id.
// Must outlive cached resolve responses, which hand out the same id again.
const TTL_MS = Math.max(30 * 60_000, config.resolveCacheTtlMs + 5 * 60_000);
const MAX_ENTRIES = 2_000;
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

async function renderSprite(source: PreviewSource): Promise<Buffer> {
  const ffmpeg = ffmpegLocation();
  if (!ffmpeg) throw new AppError("INTERNAL", "ffmpeg not found");

  const dir = await mkdtemp(path.join(config.tmpDir ?? tmpdir(), "yoink-preview-"));
  const out = path.join(dir, "sprite.jpg");
  const headerBlob = Object.entries(source.headers)
    .filter(([key, value]) => /^[A-Za-z0-9-]+$/.test(key) && !/[\r\n]/.test(value))
    .map(([key, value]) => `${key}: ${value}\r\n`)
    .join("");

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
        ...(headerBlob ? ["-headers", headerBlob] : []),
        // Long videos: keyframes only (~10x cheaper). Short clips may have just one keyframe.
        ...(source.durationSec > 60 ? ["-skip_frame", "nokey"] : []),
        "-i",
        source.url,
        "-an",
        "-vf",
        // tpad repeats the last frame so the tile always fills, even if the final keyframe lands early.
        `tpad=stop_mode=clone:stop_duration=${source.durationSec.toFixed(3)},fps=${PREVIEW_FRAMES}/${source.durationSec.toFixed(3)},scale=${PREVIEW_FRAME_WIDTH}:-2,tile=${PREVIEW_FRAMES}x1`,
        "-frames:v",
        "1",
        "-q:v",
        "5",
        "-y",
        out,
      ],
      { timeoutMs: 30_000 },
    );
    const sprite = result.code === 0 ? await readFile(out).catch(() => null) : null;
    if (!sprite?.length) throw new AppError("NOT_FOUND", "Preview unavailable.");
    return sprite;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function getPreviewSprite(id: string): Promise<Buffer> {
  const source = /^[A-Za-z0-9_-]{16,32}$/.test(id) ? sources.get(id) : undefined;
  if (!source || source.expires <= Date.now()) throw new AppError("NOT_FOUND", "Preview expired — fetch the link again.");
  source.sprite ??= slots.run(() => renderSprite(source)).catch((err) => {
    source.sprite = undefined;
    throw err;
  });
  return source.sprite;
}
