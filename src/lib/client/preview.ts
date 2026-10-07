import { PREVIEW_FRAME_WIDTH, PREVIEW_FRAMES, type StreamRef } from "@/lib/media-types";
import { fetchStream, markCorsBlocked, streamUrls } from "./fetch-media";
import { withFFmpeg } from "./ffmpeg";

/**
 * Filmstrip sprites and exact preview frames, drawn in the browser from the item's
 * preview stream with a <video> element and a canvas. Seeking only fetches the
 * byte ranges it needs, so a long video isn't downloaded just to preview it.
 */

export interface SpriteImage {
  url: string;
  /** A single frame's width / height. */
  aspect: number;
}

interface Source {
  video: Promise<HTMLVideoElement>;
  sprite?: Promise<SpriteImage>;
  /** Single preview frames keyed by tenth of a second. */
  stills: Map<number, Promise<string>>;
  /** Seeks run one at a time. */
  queue: Promise<unknown>;
  urls: Set<string>;
}

const MAX_SOURCES = 24;
const MAX_STILLS_PER_SOURCE = 24;
const STILL_WIDTH = 480;
const LOAD_TIMEOUT_MS = 30_000;
const SEEK_TIMEOUT_MS = 15_000;
const sources = new Map<string, Source>();

function waitFor(video: HTMLVideoElement, event: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = (err?: Error) => {
      clearTimeout(timer);
      video.removeEventListener(event, onEvent);
      video.removeEventListener("error", onError);
      if (err) reject(err);
      else resolve();
    };
    const onEvent = () => done();
    const onError = () => done(new Error("video failed to load"));
    const timer = setTimeout(() => done(new Error(`timed out waiting for ${event}`)), timeoutMs);
    video.addEventListener(event, onEvent);
    video.addEventListener("error", onError);
  });
}

async function tryLoad(src: string): Promise<HTMLVideoElement> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  // Needed to read pixels back from a cross-origin CDN; harmless for same-origin sources.
  video.crossOrigin = "anonymous";
  video.setAttribute("aria-hidden", "true");
  // Some mobile browsers won't load media that isn't in the document.
  video.style.cssText = "position:fixed;left:-10px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
  document.body.appendChild(video);
  try {
    const loaded = waitFor(video, "loadeddata", LOAD_TIMEOUT_MS);
    video.src = src;
    video.load();
    await loaded;
    if (!video.videoWidth || !video.videoHeight) throw new Error("no picture");
    return video;
  } catch (err) {
    video.removeAttribute("src");
    video.load();
    video.remove();
    throw err;
  }
}

/** HLS can't play in a <video> on most browsers; fetch it and remux to MP4 first. */
async function hlsAsMp4(ref: StreamRef): Promise<string> {
  const media = await fetchStream(ref);
  const blob = await withFFmpeg([{ name: `v.${media.ext}`, data: media.blob }], async (job) => {
    const out = `${job.outDir}/preview.mp4`;
    await job.exec(["-i", `${job.inputDir}/v.${media.ext}`, "-map", "0:v:0", "-c", "copy", "-movflags", "+faststart", "-y", out]);
    return new Blob([await job.readFile(out)], { type: "video/mp4" });
  });
  return URL.createObjectURL(blob);
}

async function openVideo(ref: StreamRef, urls: Set<string>): Promise<HTMLVideoElement> {
  if (ref.hls) {
    const url = await hlsAsMp4(ref);
    urls.add(url);
    return tryLoad(url);
  }
  const candidates = streamUrls(ref);
  for (const [index, { url, direct }] of candidates.entries()) {
    try {
      return await tryLoad(url);
    } catch (err) {
      if (index === candidates.length - 1) throw err;
      if (direct) markCorsBlocked(url);
    }
  }
  throw new Error("no preview source");
}

function source(ref: StreamRef): Source {
  let entry = sources.get(ref.proxy);
  if (!entry) {
    if (sources.size >= MAX_SOURCES) dispose(sources.keys().next().value!);
    const urls = new Set<string>();
    entry = { video: openVideo(ref, urls), stills: new Map(), queue: Promise.resolve(), urls };
    entry.video.catch((err) => {
      console.warn("[yoink] preview stream failed to load", { ext: ref.ext, hls: ref.hls, direct: !!ref.url }, err);
      sources.delete(ref.proxy);
    });
    sources.set(ref.proxy, entry);
  }
  return entry;
}

function dispose(key: string): void {
  const entry = sources.get(key);
  if (!entry) return;
  sources.delete(key);
  entry.video.then((video) => video.remove(), () => undefined);
  for (const url of entry.urls) URL.revokeObjectURL(url);
}

/** Runs `task` after the source's earlier seeks finish. */
function serial<T>(entry: Source, task: (video: HTMLVideoElement) => Promise<T>): Promise<T> {
  const run = entry.queue.then(() => entry.video).then(task);
  entry.queue = run.catch(() => undefined);
  return run;
}

async function seek(video: HTMLVideoElement, sec: number): Promise<void> {
  if (Math.abs(video.currentTime - sec) < 0.001 && video.readyState >= 2) return;
  const seeked = waitFor(video, "seeked", SEEK_TIMEOUT_MS);
  video.currentTime = sec;
  await seeked;
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

function toUrl(canvas: HTMLCanvasElement, quality: number, urls: Set<string>): Promise<string> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("couldn't encode frame"));
        const url = URL.createObjectURL(blob);
        urls.add(url);
        resolve(url);
      },
      "image/jpeg",
      quality,
    ),
  );
}

/** PREVIEW_FRAMES evenly spaced frames in one row, each PREVIEW_FRAME_WIDTH wide. */
export function getSprite(ref: StreamRef, durationSec: number): Promise<SpriteImage> {
  const entry = source(ref);
  entry.sprite ??= serial(entry, async (video) => {
    const height = even((PREVIEW_FRAME_WIDTH * video.videoHeight) / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = PREVIEW_FRAME_WIDTH * PREVIEW_FRAMES;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : durationSec;
    for (let i = 0; i < PREVIEW_FRAMES; i++) {
      await seek(video, Math.min((i * durationSec) / PREVIEW_FRAMES, Math.max(0, duration - 0.05)));
      ctx.drawImage(video, i * PREVIEW_FRAME_WIDTH, 0, PREVIEW_FRAME_WIDTH, height);
    }
    return { url: await toUrl(canvas, 0.8, entry.urls), aspect: PREVIEW_FRAME_WIDTH / height };
  }).catch((err) => {
    entry.sprite = undefined;
    throw err;
  });
  return entry.sprite;
}

/** One exact frame (decoded at `sec`, not snapped to a keyframe) for the frame picker. */
export function getStill(ref: StreamRef, sec: number, durationSec: number): Promise<string> {
  const entry = source(ref);
  const key = Math.round(sec * 10);
  let still = entry.stills.get(key);
  if (!still) {
    if (entry.stills.size >= MAX_STILLS_PER_SOURCE) {
      const oldest = entry.stills.keys().next().value!;
      entry.stills.get(oldest)!.then((url) => {
        URL.revokeObjectURL(url);
        entry.urls.delete(url);
      }, () => undefined);
      entry.stills.delete(oldest);
    }
    still = serial(entry, async (video) => {
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : durationSec;
      // The last instant of a video often has no frame left to decode; back off slightly.
      await seek(video, Math.max(0, Math.min(key / 10, duration - 0.1)));
      const canvas = document.createElement("canvas");
      canvas.width = STILL_WIDTH;
      canvas.height = even((STILL_WIDTH * video.videoHeight) / video.videoWidth);
      canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
      return toUrl(canvas, 0.85, entry.urls);
    }).catch((err) => {
      entry.stills.delete(key);
      throw err;
    });
    entry.stills.set(key, still);
  }
  return still;
}
