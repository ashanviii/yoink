import type { ContentKind, PlatformId } from "./platforms";

/** Shapes shared by the API routes and the client UI. */

export type OptionKind = "video" | "audio";

export interface MediaOption {
  /** Signed token the client sends back to start this download. */
  token: string;
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

export interface MediaItem {
  id: string;
  title: string;
  /** Same-origin proxied thumbnail URL, or null. */
  thumbnail: string | null;
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

export interface JobState {
  id: string;
  status: JobStatus;
  /** 0–100, or null when unknown. */
  progress: number | null;
  fileName: string | null;
  sizeBytes: number | null;
  error: { code: string; message: string } | null;
}
