import type { ConversionAudioOptions, ConversionVideoOptions, CropRectangle, InputVideoTrack, OutputFormat, Rotation } from "mediabunny";
import { ApiError } from "@/lib/api-client";
import { MAX_EXTRACT_FRAMES, type CropParams, type DownloadRecipe, type FrameFormat, type JobParams } from "@/lib/media-types";
import { zipBlob, type ZipEntry } from "@/lib/zip";
import type { FetchedMedia } from "./fetch-media";

/**
 * Builds downloads with the browser's own codecs (WebCodecs, usually the device's hardware
 * video encoder) through Mediabunny. Next to ffmpeg.wasm there's no 32 MB core to download
 * and compile, merging video with its sound is a straight copy, and phones encode in real
 * time instead of at a fraction of it.
 *
 * Anything this can't do throws NativeUnsupported, and the caller falls back to ffmpeg:
 * speed changes (they need pitch-preserving time stretching), GIFs, and whatever codec the
 * browser can't decode or encode.
 */

export class NativeUnsupported extends Error {}

/** Whether the native path could plausibly handle these params; used to skip ffmpeg's preload. */
export function nativeMayHandle(params: JobParams = {}): boolean {
  if (params.speed || params.format === "gif") return false;
  // Plain audio copies need no codecs; everything else decodes video.
  return typeof VideoDecoder !== "undefined";
}

interface NativeOptions {
  signal: AbortSignal;
  onProgress: (fraction: number) => void;
}

const mediabunny = () => import("mediabunny");

/** A trim's start may move by at most this much to let video be copied instead of re-encoded. */
const COPY_START_TOLERANCE_SEC = 0.1;

export async function buildNative(
  recipe: DownloadRecipe,
  fetched: FetchedMedia[],
  params: JobParams,
  { signal, onProgress }: NativeOptions,
): Promise<Blob> {
  if (!nativeMayHandle(params) && !(recipe.mode === "audio-m4a")) throw new NativeUnsupported("needs ffmpeg");
  const mb = await mediabunny();
  const inputs = fetched.map((media) => new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(media.blob) }));
  try {
    if (params.frames) {
      const track = await inputs[0].getPrimaryVideoTrack();
      if (!track) throw new NativeUnsupported("no video track");
      if (!(await track.canDecode())) throw new NativeUnsupported(`can't decode ${track.codec}`);
      const duration = await inputs[0].computeDuration();
      return params.frames.mode === "single"
        ? await singleFrame(mb, track, params.frames.at, duration, params.frames.format)
        : await frameSet(mb, track, params.frames.every, duration, params.frames.format, signal, onProgress);
    }
    return await convert(mb, recipe, inputs, fetched, params, signal, onProgress);
  } finally {
    for (const input of inputs) input.dispose();
  }
}

type Mediabunny = Awaited<ReturnType<typeof mediabunny>>;

/** Remuxes, merges and/or re-encodes into MP4, WebM, M4A or MP3. */
async function convert(
  mb: Mediabunny,
  recipe: DownloadRecipe,
  inputs: InstanceType<Mediabunny["Input"]>[],
  fetched: FetchedMedia[],
  params: JobParams,
  signal: AbortSignal,
  onProgress: (fraction: number) => void,
): Promise<Blob> {
  const audioOnly = recipe.mode !== "video";
  let format: OutputFormat;
  if (recipe.mode === "audio-mp3") {
    if (!(await mb.canEncodeAudio("mp3"))) {
      const { registerMp3Encoder } = await import("@mediabunny/mp3-encoder");
      registerMp3Encoder();
    }
    format = new mb.Mp3OutputFormat();
  } else if (params.format === "webm") {
    format = new mb.WebMOutputFormat();
  } else {
    format = new mb.Mp4OutputFormat({ fastStart: "in-memory" });
  }
  const target = new mb.BufferTarget();
  const output = new mb.Output({ format, target });

  const videoTrack = audioOnly ? null : await inputs[0].getPrimaryVideoTrack();
  if (!audioOnly && !videoTrack) throw new NativeUnsupported("no video track");
  const video = videoTrack ? await videoOptions(mb, videoTrack, recipe, fetched, params) : { discard: true };
  const audio = await audioOptions(mb, recipe, params);
  const trim = params.trim ? { start: params.trim.start, end: params.trim.end } : undefined;
  const copy = { mode: "preferred" as const, boundaryPolicy: "expand" as const, boundaryTolerance: COPY_START_TOLERANCE_SEC };

  // One conversion per input file, all writing into the same output: with a separate sound
  // file (Instagram, Facebook), the first brings the picture and the second the sound.
  const separateAudio = inputs.length > 1;
  const conversions = await Promise.all(
    inputs.map((input, i) =>
      mb.Conversion.init({
        input,
        output,
        composable: true,
        tracks: "primary",
        trim,
        copy,
        video: i === 0 ? video : { discard: true },
        audio: separateAudio && i === 0 ? { discard: true } : audio,
        showWarnings: false,
      }),
    ),
  );
  for (const conversion of conversions) {
    const lost = conversion.discardedTracks.filter((d) => d.reason !== "discarded_by_user");
    if (!conversion.isValid || lost.length) {
      throw new NativeUnsupported(`can't convert: ${lost.map((d) => `${d.track.type} ${d.reason}`).join(", ") || "invalid"}`);
    }
  }
  if (audioOnly && !conversions.some((c) => c.utilizedTracks.some((t) => t.type === "audio"))) {
    throw new ApiError("NO_MEDIA", "This video has no sound to save.");
  }
  if (audioOnly) {
    output.setMetadataTags({
      title: recipe.meta.title ?? undefined,
      artist: recipe.meta.artist ?? undefined,
      comment: recipe.meta.url,
    });
  }

  // The picture is the slow part, so it drives the bar.
  conversions[0].onProgress = (fraction) => onProgress(fraction);
  const onAbort = () => conversions.forEach((c) => void c.cancel());
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    await output.start();
    await Promise.all(conversions.map((c) => c.execute()));
    await output.finalize();
  } catch (err) {
    await output.cancel().catch(() => undefined);
    throw err;
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
  if (!target.buffer) throw new NativeUnsupported("empty output");
  return new Blob([target.buffer], { type: format.mimeType });
}

/**
 * The jobs's picture edits in Mediabunny's terms. It rotates, then flips horizontally, then
 * crops in the transformed frame; ours crop the source frame, then flip, then rotate.
 */
async function videoOptions(
  mb: Mediabunny,
  track: InputVideoTrack,
  recipe: DownloadRecipe,
  fetched: FetchedMedia[],
  params: JobParams,
): Promise<ConversionVideoOptions> {
  if (!(await track.canDecode())) throw new NativeUnsupported(`can't decode ${track.codec}`);
  const W = track.displayWidth;
  const H = track.displayHeight;
  const userRotate = params.rotate ?? 0;
  // R_r∘H = H∘R_-r, and a vertical flip is a horizontal one turned 180°.
  const turn = params.flip === "vertical" ? userRotate + 180 : userRotate;
  const rotate = (params.flip ? (360 - (turn % 360)) % 360 : userRotate) as Rotation;
  const flip = !!params.flip;

  const crop = params.crop ? cropInOutputFrame(params.crop, W, H, params) : undefined;
  const area = crop ? (crop.width * crop.height) / (W * H) : 1;
  const edited = !!(params.crop || params.rotate || params.flip);

  // A trim alone is a straight copy (instant) when a keyframe sits within a hair of its start;
  // otherwise the picture has to be re-encoded to start exactly there.
  let transcode = edited || params.format === "webm";
  if (!transcode && params.trim && params.trim.start > 0) {
    const key = await new mb.EncodedPacketSink(track).getKeyPacket(params.trim.start, { verifyKeyPackets: true });
    transcode = !key || params.trim.start - key.timestamp > COPY_START_TOLERANCE_SEC;
  }

  const options: ConversionVideoOptions = {
    rotate,
    flip,
    // A full-frame crop when re-encoding without one: it routes frames through Mediabunny's
    // redraw path, which measured twice as fast as handing decoded frames straight to the
    // encoder (and avoids encoders that reject some decoded frame formats).
    crop: crop ?? (transcode ? { left: 0, top: 0, width: rotate % 180 ? H : W, height: rotate % 180 ? W : H } : undefined),
    // Rotation and flips are baked into the picture: not every app honours the metadata form.
    allowTransformationMetadata: false,
    forceTranscode: transcode || undefined,
  };
  if (params.format === "webm") {
    const codec = await mb.getFirstEncodableVideoCodec(["vp8", "vp9"], { width: crop?.width ?? W, height: crop?.height ?? H });
    if (!codec) throw new NativeUnsupported("no WebM video encoder");
    options.codec = codec;
  } else if (transcode) {
    // H.264 for anything re-encoded. Untouched pictures keep their codec (Facebook's VP9 too),
    // so a plain merge stays a copy.
    options.codec = "avc";
  }
  // Setting a bitrate forces a re-encode, so it's only set when the picture is re-encoded anyway.
  if (transcode) {
    const sourceBps = recipe.durationSec ? (fetched[0].blob.size * 8) / recipe.durationSec : 0;
    options.bitrate = sourceBps
      ? Math.round(Math.min(15e6, Math.max(8e5, sourceBps * 1.3 * Math.max(area, 0.25))))
      : mb.QUALITY_HIGH;
  }
  return options;
}

async function audioOptions(mb: Mediabunny, recipe: DownloadRecipe, params: JobParams): Promise<ConversionAudioOptions> {
  if (params.volume === 0) return { discard: true };
  const options: ConversionAudioOptions = {};
  if (recipe.mode === "audio-mp3") {
    options.codec = "mp3";
    options.bitrate = 192_000;
  } else if (params.format === "webm") {
    options.codec = "opus";
    options.bitrate = 128_000;
  } else if (params.volume !== undefined) {
    options.codec = "aac";
    options.bitrate = 192_000;
  }
  if (params.volume !== undefined && params.volume !== 1) {
    const gain = params.volume;
    options.process = (sample) => withGain(mb, sample, gain);
  }
  return options;
}

/** Scales every sample, clipping at full scale. */
function withGain(mb: Mediabunny, sample: InstanceType<Mediabunny["AudioSample"]>, gain: number) {
  const channels = sample.numberOfChannels;
  const frames = sample.numberOfFrames;
  const data = new Float32Array(channels * frames);
  for (let c = 0; c < channels; c++) {
    const plane = data.subarray(c * frames, (c + 1) * frames);
    sample.copyTo(plane, { planeIndex: c, format: "f32-planar" });
    for (let i = 0; i < frames; i++) plane[i] = Math.max(-1, Math.min(1, plane[i] * gain));
  }
  return new mb.AudioSample({ data, format: "f32-planar", numberOfChannels: channels, sampleRate: sample.sampleRate, timestamp: sample.timestamp });
}

/**
 * The crop box in pixels, rounded like the ffmpeg path (even sizes, a locked shape derives
 * its height from the width), then carried through the flip and rotation.
 */
function cropInOutputFrame({ x, y, w, h, ratio }: CropParams, W: number, H: number, params: JobParams): CropRectangle {
  const even = (n: number) => Math.max(2, Math.floor(n / 2) * 2);
  const cw = Math.min(even(W * w), even(W));
  const ch = ratio ? Math.min(even(cw / ratio), even(H)) : Math.min(even(H * h), even(H));
  const cx = Math.min(Math.floor(W * x), W - cw);
  const cy = Math.min(Math.floor(H * y), H - ch);

  // Map both corners through flip, then rotate (clockwise), in the source frame's size.
  const corner = (px: number, py: number): [number, number] => {
    if (params.flip === "horizontal") px = W - px;
    if (params.flip === "vertical") py = H - py;
    switch (params.rotate) {
      case 90:
        return [H - py, px];
      case 180:
        return [W - px, H - py];
      case 270:
        return [py, W - px];
      default:
        return [px, py];
    }
  };
  const [ax, ay] = corner(cx, cy);
  const [bx, by] = corner(cx + cw, cy + ch);
  return { left: Math.min(ax, bx), top: Math.min(ay, by), width: Math.abs(bx - ax), height: Math.abs(by - ay) };
}

async function canvasBlob(canvas: HTMLCanvasElement | OffscreenCanvas, format: FrameFormat): Promise<Blob> {
  const type = format === "jpg" ? "image/jpeg" : "image/png";
  // JPEG at 0.95 matches ffmpeg's -q:v 2.
  const quality = format === "jpg" ? 0.95 : undefined;
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type, quality });
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("couldn't encode frame"))), type, quality),
  );
}

async function singleFrame(mb: Mediabunny, track: InputVideoTrack, at: number, duration: number, format: FrameFormat): Promise<Blob> {
  const sink = new mb.CanvasSink(track, { poolSize: 1 });
  // The last instant often has no frame left to show; back off slightly.
  const frame = (await sink.getCanvas(Math.max(0, Math.min(at, duration - 0.05)))) ?? (await sink.getCanvas(Math.max(0, duration - 0.5)));
  if (!frame) throw new ApiError("NO_MEDIA", "Couldn't grab that frame. Try a slightly different moment.");
  return canvasBlob(frame.canvas, format);
}

async function frameSet(
  mb: Mediabunny,
  track: InputVideoTrack,
  every: number,
  duration: number,
  format: FrameFormat,
  signal: AbortSignal,
  onProgress: (fraction: number) => void,
): Promise<Blob> {
  const times: number[] = [];
  for (let t = 0; t < duration && times.length < MAX_EXTRACT_FRAMES; t += every) times.push(t);
  const sink = new mb.CanvasSink(track, { poolSize: 2 });
  const entries: ZipEntry[] = [];
  for await (const frame of sink.canvasesAtTimestamps(times)) {
    signal.throwIfAborted();
    if (!frame) continue;
    const index = entries.length;
    entries.push({
      name: `frame-${String(index + 1).padStart(3, "0")}_${(index * every).toFixed(2)}s.${format}`,
      data: new Uint8Array(await (await canvasBlob(frame.canvas, format)).arrayBuffer()),
    });
    onProgress(entries.length / times.length);
  }
  if (entries.length === 0) throw new ApiError("NO_MEDIA", "Couldn't grab any frames from that video.");
  return zipBlob(entries);
}
