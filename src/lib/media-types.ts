import type { ContentKind, PlatformId } from "./platforms";

/** Shapes shared by the API routes and the client UI. */

export type OptionKind = "video" | "audio";

export interface TrimParams {
  start: number; // seconds
  end: number;   // seconds
}

/** Region of the frame to keep, each value a fraction (0–1) of the frame's width or height. */
export interface CropParams {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Locked output shape (width / height in pixels), e.g. 1 for square. Free-form when absent. */
  ratio?: number;
}

export type FrameFormat = "jpg" | "png";

/** Still images pulled from the video: one frame at a timestamp, or one every `every` seconds (zipped). */
export type FrameParams =
  | { mode: "single"; at: number; format: FrameFormat }
  | { mode: "interval"; every: number; format: FrameFormat };

/** Cap on images in one frame-set ZIP. */
export const MAX_EXTRACT_FRAMES = 120;

/** Playback speeds offered for a video download. */
export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
/** Clockwise rotation in degrees. */
export type Rotation = 0 | 90 | 180 | 270;

export type Flip = "none" | "horizontal" | "vertical";

/** Extra processing for a download: trim, crop, speed up and/or rotate a video, or pull frames from it. */
export interface JobParams {
  trim?: TrimParams;
  /** In the source frame's coordinates, applied before rotating. */
  crop?: CropParams;
  /** Playback speed multiplier; absent means 1×. */
  speed?: number;
  /** Volume multiplier, 0 to drop the sound; absent means unchanged. */
  volume?: number;
  /** Absent means unrotated. */
  rotate?: Exclude<Rotation, 0>;
  /** Mirror horizontally or vertically, before rotating. Absent means unflipped. */
  flip?: Exclude<Flip, "none">;
  frames?: FrameParams;
}

/**
 * One media file the browser fetches. It tries `url` straight from the platform's
 * CDN first; when that isn't allowed (CORS, required cookies) it falls back to
 * `proxy`, a same-origin pass-through that never stores or processes anything.
 */
export interface StreamRef {
  /** Direct CDN URL, or null when the CDN needs headers a browser can't send. */
  url: string | null;
  /** Same-origin /api/media URL that streams the same bytes. */
  proxy: string;
  /** HLS playlist (fetched segment by segment) rather than a single file. */
  hls: boolean;
  /** Container of the file, e.g. "mp4", "webm", "m4a". */
  ext: string;
}

export type OutputMode = "video" | "audio-mp3" | "audio-m4a";

/** Everything the browser needs to build one download. */
export interface DownloadRecipe {
  /** One file, or a video-only stream followed by an audio-only stream to merge. */
  streams: StreamRef[];
  mode: OutputMode;
  /** Media id + title for the filename. */
  stem: string;
  /** Human label used in the filename, e.g. "1080p" ("" for none). */
  label: string;
  /** Written into audio files' tags. */
  meta: { title: string | null; artist: string | null; url: string };
}

export interface MediaOption {
  recipe: DownloadRecipe;
  kind: OptionKind;
  /** e.g. "1080p", "MP3" */
  label: string;
  /** e.g. "MP4 · H.264", "Best quality · VBR" */
  detail: string;
  ext: string;
  sizeBytes: number | null;
  sizeIsEstimate: boolean;
  badges: string[];
  /** Highest quality option of its kind. */
  best: boolean;
}

/** Frames in the trim filmstrip sprite (one horizontal row). */
export const PREVIEW_FRAMES = 16;
export const PREVIEW_FRAME_WIDTH = 120;

export interface MediaItem {
  id: string;
  title: string;
  /** Same-origin proxied thumbnail URL, or null. */
  thumbnail: string | null;
  /** Small video-only stream the browser draws the filmstrip and frame previews from, or null. */
  preview: StreamRef | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  options: MediaOption[];
}

export interface ResolveResponse {
  platform: PlatformId;
  kind: ContentKind;
  sourceUrl: string;
  title: string;
  uploader: string | null;
  items: MediaItem[];
}

export type JobStatus = "queued" | "downloading" | "processing" | "ready" | "error";

/** Progress of a download being built in the browser. */
export interface JobState {
  status: JobStatus;
  /** 0–100, or null when unknown. */
  progress: number | null;
  fileName: string | null;
  sizeBytes: number | null;
}
