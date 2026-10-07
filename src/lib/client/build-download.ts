import { ApiError } from "@/lib/api-client";
import { GIF_FPS, GIF_SIZE, MAX_EXTRACT_FRAMES, type CropParams, type DownloadRecipe, type FrameFormat, type JobParams, type JobStatus, type StreamRef } from "@/lib/media-types";
import { zipBlob } from "@/lib/zip";
import { fetchStream, type FetchedMedia } from "./fetch-media";
import { preloadFFmpeg, withFFmpeg, type FFmpegJob } from "./ffmpeg";

/**
 * Builds a download entirely in the browser: fetch the stream(s), then merge, trim,
 * convert or cut frames with ffmpeg.wasm when needed. The result never touches a server.
 */

export interface BuildUpdate {
  status: JobStatus;
  /** 0–100, or null when unknown. */
  progress: number | null;
}

export interface BuiltFile {
  blob: Blob;
  fileName: string;
}

interface BuildOptions {
  signal: AbortSignal;
  onUpdate: (update: BuildUpdate) => void;
}

const MIME: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  gif: "image/gif",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  jpg: "image/jpeg",
  png: "image/png",
  zip: "application/zip",
};

const PROCESSING_FAILED = "Something broke while processing that in your browser. Try again.";

// --- source videos kept so repeat frame grabs skip the download ---
const FRAME_CACHE_BYTES = 512 * 1024 * 1024;
const frameSources = new Map<string, { media: Promise<FetchedMedia>; size: number; done: boolean }>();

function evictFrameSources(): void {
  let total = [...frameSources.values()].reduce((sum, entry) => sum + entry.size, 0);
  for (const [key, entry] of frameSources) {
    if (total <= FRAME_CACHE_BYTES || frameSources.size <= 1) break;
    frameSources.delete(key);
    total -= entry.size;
  }
}

/** Shares one download per stream between frame grabs; `onWait` fires when joining one already running. */
function frameSource(ref: StreamRef, options: { onProgress: (fraction: number | null) => void; onWait: () => void }): Promise<FetchedMedia> {
  const cached = frameSources.get(ref.proxy);
  if (cached) {
    // Most recently used goes last.
    frameSources.delete(ref.proxy);
    frameSources.set(ref.proxy, cached);
    // Another grab is still downloading it: wait for that one instead of fetching twice.
    if (!cached.done) options.onWait();
    return cached.media;
  }
  // Not tied to one job's signal: other grabs may be waiting on it.
  const entry = { media: fetchStream(ref, { onProgress: options.onProgress }), size: 0, done: false };
  frameSources.set(ref.proxy, entry);
  entry.media.then(
    (media) => {
      entry.size = media.blob.size;
      entry.done = true;
      evictFrameSources();
    },
    () => frameSources.delete(ref.proxy),
  );
  return entry.media;
}

// --- ffmpeg recipes (same settings the server used) ---

function encoderArgs(format: FrameFormat): string[] {
  // JPEG q 2 is near-lossless. "-huffman default" is required: the wasm build's MJPEG encoder
  // traps with "memory access out of bounds" in its default optimal-Huffman mode, depending on
  // frame size and quality. PNG is lossless at any setting; the default (no row filter) makes
  // ~40% larger files than the "up" filter for the same CPU.
  return format === "jpg" ? ["-q:v", "2", "-huffman", "default"] : ["-pred", "up", "-compression_level", "3"];
}

function metadataArgs(meta: DownloadRecipe["meta"]): string[] {
  const args: string[] = [];
  if (meta.title) args.push("-metadata", `title=${meta.title}`);
  if (meta.artist) args.push("-metadata", `artist=${meta.artist}`);
  args.push("-metadata", `comment=${meta.url}`, "-metadata", `purl=${meta.url}`);
  return args;
}

async function singleFrame(job: FFmpegJob, video: string, at: number, format: FrameFormat): Promise<Blob> {
  const out = `${job.outDir}/frame.${format}`;
  // Input seeking decodes from the previous keyframe up to `at`, so the frame is exact.
  await job.exec(["-ss", at.toFixed(3), "-i", video, "-map", "0:v:0", "-frames:v", "1", ...encoderArgs(format), "-y", out]);
  if (!(await job.exists(out))) {
    // Seeking past the last frame yields nothing; fall back to the final frame.
    await job.exec(["-sseof", "-1", "-i", video, "-map", "0:v:0", "-update", "1", ...encoderArgs(format), "-y", out]);
  }
  if (!(await job.exists(out))) throw new ApiError("NO_MEDIA", "Couldn't grab that frame. Try a slightly different moment.");
  return new Blob([await job.readFile(out)], { type: MIME[format] });
}

async function frameSet(job: FFmpegJob, video: string, every: number, format: FrameFormat): Promise<Blob> {
  await job.exec([
    "-i",
    video,
    "-map",
    "0:v:0",
    "-vf",
    `fps=1/${every}`,
    "-frames:v",
    String(MAX_EXTRACT_FRAMES),
    ...encoderArgs(format),
    "-y",
    `${job.outDir}/%04d.${format}`,
  ]);
  const files = (await job.listDir(job.outDir)).filter((name) => name.endsWith(`.${format}`));
  if (files.length === 0) throw new ApiError("NO_MEDIA", "Couldn't grab any frames from that video.");

  const entries = [];
  for (const [index, file] of files.entries()) {
    entries.push({
      name: `frame-${String(index + 1).padStart(3, "0")}_${(index * every).toFixed(2)}s.${format}`,
      data: await job.readFile(`${job.outDir}/${file}`),
    });
  }
  return zipBlob(entries);
}

/**
 * libx264 needs even dimensions, so the crop size is rounded down to a multiple of 2. A locked
 * shape derives the height from the width, since each quality's frame size can differ slightly.
 */
function cropFilter({ x, y, w, h, ratio }: CropParams): string {
  const f = (n: number) => n.toFixed(4);
  // "\," escapes the comma inside min() from the filtergraph parser; ffmpeg clamps x/y to fit.
  const height = ratio ? `min(trunc(ow/${ratio.toFixed(6)}/2)*2\\,trunc(ih/2)*2)` : `trunc(ih*${f(h)}/2)*2`;
  return `crop=trunc(iw*${f(w)}/2)*2:${height}:trunc(iw*${f(x)}):trunc(ih*${f(y)})`;
}

const ROTATE_FILTER = { 90: "transpose=clock", 180: "hflip,vflip", 270: "transpose=cclock" } as const;
const FLIP_FILTER = { horizontal: "hflip", vertical: "vflip" } as const;

/**
 * Trimming jumps (fast input seek) to this long before the clip, then cuts exactly with trim filters.
 * Seeking straight to the start isn't reliable: some platforms' files carry offset timestamps, and the
 * seek lands a keyframe late, losing the clip's first second or two of picture.
 */
const SEEK_MARGIN_SEC = 10;

function seekPoint({ trim }: JobParams): number {
  return trim ? Math.max(0, trim.start - SEEK_MARGIN_SEC) : 0;
}

function seekArgs(params: JobParams): string[] {
  const at = seekPoint(params);
  return at > 0 ? ["-ss", at.toFixed(3)] : [];
}

/** Keeps exactly the trimmed range (timed from the seek point) and restarts timestamps at zero. */
function trimFilter(params: JobParams, kind: "video" | "audio"): string | undefined {
  const { trim } = params;
  if (!trim) return undefined;
  const [cut, reset] = kind === "video" ? ["trim", "setpts"] : ["atrim", "asetpts"];
  return `${cut}=start=${(trim.start - seekPoint(params)).toFixed(3)}:duration=${(trim.end - trim.start).toFixed(3)},${reset}=PTS-STARTPTS`;
}

/** The picture edits, in order: the crop box is drawn on the untransformed frame, and flip comes before rotate as the preview shows it. */
function videoFilters(params: JobParams): string[] {
  const { crop, flip, rotate, speed } = params;
  return [
    trimFilter(params, "video"),
    crop && cropFilter(crop),
    flip && FLIP_FILTER[flip],
    rotate && ROTATE_FILTER[rotate],
    speed && `setpts=PTS/${speed}`,
  ].filter((f): f is string => !!f);
}

/** The sound edits: atempo changes speed without changing pitch. */
function audioFilters(params: JobParams): string[] {
  const { speed, volume } = params;
  return [trimFilter(params, "audio"), speed && `atempo=${speed}`, volume && `volume=${volume}`].filter((f): f is string => !!f);
}

const CODECS = {
  mp4: {
    video: ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p"],
    audio: ["-c:a", "aac", "-b:a", "192k"],
    extra: ["-movflags", "+faststart"],
  },
  // VP8 at libvpx's fastest settings: VP9 is far too slow to encode in a browser.
  webm: {
    video: ["-c:v", "libvpx", "-deadline", "realtime", "-cpu-used", "8", "-crf", "10", "-b:v", "3M", "-pix_fmt", "yuv420p"],
    audio: ["-c:a", "libopus", "-b:a", "128k"],
    extra: [],
  },
} as const;

/** Re-encodes the video with the chosen trim, crop, flip, rotation, speed and volume, as MP4 or WebM. */
function editArgs(inputs: string[], params: JobParams, out: string, container: keyof typeof CODECS): string[] {
  const video = videoFilters(params).join(",");
  // Audio filters are ignored when the video has no sound.
  const audio = audioFilters(params).join(",");
  const muted = params.volume === 0;
  const codecs = CODECS[container];
  // A volume-only MP4 edit leaves the picture alone, so it's copied instead of re-encoded (much faster).
  const copyVideo = container === "mp4" && !video;
  return [
    ...inputs.flatMap((input) => [...seekArgs(params), "-i", input]),
    ...(video ? ["-vf", video] : []),
    ...(audio && !muted ? ["-af", audio] : []),
    "-map",
    "0:v:0",
    ...(muted ? ["-an"] : ["-map", inputs.length > 1 ? "1:a:0?" : "0:a:0?", ...codecs.audio]),
    ...(copyVideo ? ["-c:v", "copy"] : codecs.video),
    ...codecs.extra,
    "-y",
    out,
  ];
}

/**
 * An animated GIF of the (edited) clip: scaled down, at a GIF-friendly frame rate, with a palette
 * built from the clip itself so colours stay clean.
 */
function gifArgs(inputs: string[], params: JobParams, out: string): string[] {
  // Fit inside a GIF_SIZE square (never upscaling), so tall videos don't make huge GIFs.
  const fit = `scale=w=min(${GIF_SIZE}\\,iw):h=min(${GIF_SIZE}\\,ih):force_original_aspect_ratio=decrease:flags=lanczos`;
  const chain = [...videoFilters(params), `fps=${GIF_FPS}`, fit].join(",");
  return [
    ...seekArgs(params),
    "-i",
    inputs[0],
    "-vf",
    `${chain},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
    "-map",
    "0:v:0",
    "-an",
    "-loop",
    "0",
    "-y",
    out,
  ];
}

function editsVideo(params: JobParams): boolean {
  return !!(params.trim || params.crop || params.speed || params.rotate || params.flip) || params.volume !== undefined;
}

/** A single MP4 that needs no edits is already the file: save it as fetched. */
function savesAsIs(recipe: DownloadRecipe, fetched: FetchedMedia[], params: JobParams): boolean {
  return (
    recipe.mode === "video" && !editsVideo(params) && !params.format && !params.frames && fetched.length === 1 && fetched[0].ext === "mp4"
  );
}

/** ffmpeg args turning the fetched inputs into the requested file. */
function convertArgs(recipe: DownloadRecipe, inputs: string[], params: JobParams, out: string): string[] {
  if (recipe.mode === "audio-mp3") {
    return ["-i", inputs[0], "-vn", "-map", "0:a:0", "-c:a", "libmp3lame", "-q:a", "0", ...metadataArgs(recipe.meta), "-y", out];
  }
  if (recipe.mode === "audio-m4a") {
    return ["-i", inputs[0], "-vn", "-map", "0:a:0", "-c:a", "copy", ...metadataArgs(recipe.meta), "-movflags", "+faststart", "-y", out];
  }
  if (params.format === "gif") return gifArgs(inputs, params, out);
  if (params.format === "webm") return editArgs(inputs, params, out, "webm");
  if (editsVideo(params)) return editArgs(inputs, params, out, "mp4");
  if (inputs.length > 1) {
    return ["-i", inputs[0], "-i", inputs[1], "-map", "0:v:0", "-map", "1:a:0", "-c", "copy", "-movflags", "+faststart", "-y", out];
  }
  // Remux (HLS segments, WebM, …) into MP4.
  return ["-i", inputs[0], "-map", "0", "-dn", "-ignore_unknown", "-c", "copy", "-movflags", "+faststart", "-y", out];
}

function fileName(recipe: DownloadRecipe, params: JobParams, ext: string): string {
  const label = recipe.label ? `-${recipe.label}` : "";
  let suffix = label;
  if (params.frames) {
    suffix = params.frames.mode === "single" ? `-frame-${params.frames.at.toFixed(2)}s` : `-frames-every-${params.frames.every}s`;
  } else {
    if (params.trim) suffix += "-clip";
    if (params.crop) suffix += "-cropped";
    if (params.speed) suffix += `-${params.speed}x`;
    if (params.flip) suffix += "-flipped";
    if (params.rotate) suffix += "-rotated";
    if (params.volume !== undefined) suffix += params.volume === 0 ? "-muted" : `-vol${Math.round(params.volume * 100)}`;
  }
  return `${recipe.stem}${suffix}.${ext}`;
}

function outputExt(recipe: DownloadRecipe, params: JobParams): string {
  if (params.frames) return params.frames.mode === "single" ? params.frames.format : "zip";
  return recipe.mode === "audio-mp3" ? "mp3" : recipe.mode === "audio-m4a" ? "m4a" : (params.format ?? "mp4");
}

/** Fetches every stream at once, reporting combined progress. */
async function fetchAll(streams: StreamRef[], signal: AbortSignal, onProgress: (pct: number) => void): Promise<FetchedMedia[]> {
  const fractions = streams.map(() => 0);
  return Promise.all(
    streams.map((ref, i) =>
      fetchStream(ref, {
        signal,
        onProgress: (fraction) => {
          fractions[i] = fraction ?? fractions[i];
          onProgress((fractions.reduce((a, b) => a + b, 0) / streams.length) * 100);
        },
      }),
    ),
  );
}

export async function buildDownload(recipe: DownloadRecipe, params: JobParams, { signal, onUpdate }: BuildOptions): Promise<BuiltFile> {
  let progress = 0;
  let status: JobStatus = "downloading";
  const report = (next: Partial<BuildUpdate>) => {
    status = next.status ?? status;
    if (next.progress !== undefined && next.progress !== null) progress = Math.max(progress, Math.min(next.progress, 99));
    onUpdate({ status, progress });
  };
  const ext = outputExt(recipe, params);
  const name = fileName(recipe, params, ext);

  try {
    // Frames and GIFs only need the picture.
    const streams = params.frames || params.format === "gif" ? recipe.streams.slice(0, 1) : recipe.streams;
    const mayProcess = !!params.frames || !!params.format || editsVideo(params) || recipe.mode !== "video" || streams.length > 1 || streams[0].hls || streams[0].ext !== "mp4";
    if (mayProcess) preloadFFmpeg(); // loads while the media downloads

    report({ status: "downloading", progress: 0 });
    const fetched = params.frames
      ? [
          await abortableWait(
            frameSource(streams[0], {
              onProgress: (fraction) => status === "downloading" && report({ progress: (fraction ?? 0) * 100 }),
              onWait: () => report({ status: "queued" }),
            }),
            signal,
          ),
        ]
      : await fetchAll(streams, signal, (pct) => report({ progress: pct }));

    const inputs = fetched.map((media, i) => ({ name: `${i === 0 ? "v" : "a"}.${media.ext}`, data: media.blob }));

    let blob: Blob;
    if (savesAsIs(recipe, fetched, params)) {
      blob = new Blob([fetched[0].blob], { type: MIME.mp4 });
    } else {
      report({ status: "processing" });
      blob = await withFFmpeg(
        inputs,
        async (job) => {
          report({ status: "processing" });
          const paths = inputs.map((input) => `${job.inputDir}/${input.name}`);
          if (params.frames?.mode === "single") return singleFrame(job, paths[0], params.frames.at, params.frames.format);
          if (params.frames?.mode === "interval") return frameSet(job, paths[0], params.frames.every, params.frames.format);
          const out = `${job.outDir}/out.${ext}`;
          await job.exec(convertArgs(recipe, paths, params, out));
          return new Blob([await job.readFile(out)], { type: MIME[ext] });
        },
        { signal, onWait: () => report({ status: "queued" }) },
      );
    }

    if (blob.size === 0) throw new ApiError("NO_MEDIA", "We couldn't find any downloadable video or audio in that link.");
    return { blob, fileName: name };
  } catch (err) {
    if (signal.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
    if (err instanceof ApiError) throw err;
    console.error("[yoink] building the download failed", err);
    const outOfMemory = err instanceof Error && /memory|OOM|allocation/i.test(`${err.message} ${String(err.cause ?? "")}`);
    throw new ApiError("INTERNAL", outOfMemory ? "That file is too big to process in your browser. Try a lower quality." : PROCESSING_FAILED);
  }
}

function abortableWait<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}
