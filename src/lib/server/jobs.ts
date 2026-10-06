import "server-only";
import { randomBytes } from "node:crypto";
import { mkdtemp, readdir, rm, rename, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ChildProcess } from "node:child_process";
import { AppError, toAppError } from "@/lib/errors";
import type { FrameParams, JobParams, JobState, JobStatus } from "@/lib/media-types";
import { config } from "./config";
import { extractFrames } from "./frames";
import { killTree, run } from "./process";
import { snapchatDownloadSource } from "./snapchat";
import type { DownloadTokenPayload } from "./token";
import { classifyFailure, ffmpegLocation, ytdlp } from "./ytdlp";

interface Job {
  id: string;
  owner: string;
  payload: DownloadTokenPayload;
  trim?: { start: number; end: number };
  frames?: FrameParams;
  status: JobStatus;
  progress: number | null;
  dir: string | null;
  filePath: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  error: AppError | null;
  child: ChildProcess | null;
  createdAt: number;
  finishedAt: number | null;
}

interface JobStore {
  jobs: Map<string, Job>;
  queue: Job[];
  running: number;
  sweeper: NodeJS.Timeout | null;
}

const MAX_ACTIVE_JOBS_PER_CLIENT = 2;
const PROGRESS_PREFIX = "yoink-progress ";
const FILE_PREFIX = "yoink-file ";
const DIR_PREFIX = "yoink-";

const globalForJobs = globalThis as unknown as { __yoinkJobs?: JobStore };
const store: JobStore = (globalForJobs.__yoinkJobs ??= { jobs: new Map(), queue: [], running: 0, sweeper: null });

function baseTmpDir(): string {
  return config.tmpDir ?? tmpdir();
}

function ensureSweeper(): void {
  if (store.sweeper) return;
  store.sweeper = setInterval(() => void sweep(), 60_000);
  store.sweeper.unref();
  void removeStaleDirs();
}

async function sweep(): Promise<void> {
  const now = Date.now();
  for (const job of store.jobs.values()) {
    const finishedLongAgo = job.finishedAt !== null && now - job.finishedAt > config.fileTtlMs;
    const stuck = job.finishedAt === null && now - job.createdAt > config.downloadTimeoutMs * 2;
    if (finishedLongAgo || stuck) {
      if (job.child) killTree(job.child);
      store.jobs.delete(job.id);
      await cleanup(job);
    }
  }
}

/** Removes temp dirs left behind by a previous crash/restart. */
async function removeStaleDirs(): Promise<void> {
  try {
    const base = baseTmpDir();
    const entries = await readdir(base, { withFileTypes: true });
    const live = new Set([...store.jobs.values()].map((job) => job.dir));
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && entry.name.startsWith(DIR_PREFIX))
        .map(async (entry) => {
          const dir = path.join(base, entry.name);
          if (live.has(dir)) return;
          const info = await stat(dir).catch(() => null);
          if (info && Date.now() - info.mtimeMs > config.fileTtlMs * 2) {
            await rm(dir, { recursive: true, force: true }).catch(() => undefined);
          }
        }),
    );
  } catch {
    // best effort
  }
}

async function cleanup(job: Job): Promise<void> {
  if (job.dir) await rm(job.dir, { recursive: true, force: true }).catch(() => undefined);
  job.dir = null;
  job.filePath = null;
}

export function toJobState(job: Job): JobState {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress === null ? null : Math.round(job.progress * 10) / 10,
    fileName: job.fileName,
    sizeBytes: job.sizeBytes,
    error: job.error ? { code: job.error.code, message: job.error.message } : null,
  };
}

export function createJob(payload: DownloadTokenPayload, owner: string, { trim, frames }: JobParams = {}): Job {
  ensureSweeper();

  const active = [...store.jobs.values()].filter(
    (job) => job.owner === owner && (job.status === "queued" || job.status === "downloading" || job.status === "processing"),
  );
  if (active.length >= MAX_ACTIVE_JOBS_PER_CLIENT) {
    throw new AppError("RATE_LIMITED", "You already have downloads running — let those finish first.", { retryAfter: 10 });
  }
  if (store.queue.length >= config.maxQueuedJobs) throw new AppError("BUSY", undefined, { retryAfter: 15 });

  const job: Job = {
    id: randomBytes(16).toString("base64url"),
    owner,
    payload,
    trim,
    frames,
    status: "queued",
    progress: null,
    dir: null,
    filePath: null,
    fileName: null,
    sizeBytes: null,
    error: null,
    child: null,
    createdAt: Date.now(),
    finishedAt: null,
  };
  store.jobs.set(job.id, job);
  store.queue.push(job);
  pump();
  return job;
}

export function jobStats() {
  return { running: store.running, queued: store.queue.length, max: config.maxConcurrentJobs, maxQueue: config.maxQueuedJobs };
}

export function getJob(id: string): Job | undefined {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{16,32}$/.test(id)) return undefined;
  return store.jobs.get(id);
}

function pump(): void {
  while (store.running < config.maxConcurrentJobs && store.queue.length > 0) {
    const job = store.queue.shift()!;
    store.running += 1;
    void execute(job).finally(() => {
      store.running -= 1;
      pump();
    });
  }
}

function modeArgs(mode: DownloadTokenPayload["m"]): string[] {
  switch (mode) {
    case "video":
      return ["--merge-output-format", "mp4", "--remux-video", "mp4"];
    case "audio-mp3":
      return ["--extract-audio", "--audio-format", "mp3", "--audio-quality", "0", "--embed-metadata"];
    case "audio-m4a":
      return ["--extract-audio", "--audio-format", "m4a", "--embed-metadata"];
  }
}

async function trimVideo(filePath: string, start: number, end: number, job: Job): Promise<string> {
  const ffmpeg = ffmpegLocation();
  if (!ffmpeg) throw new AppError("INTERNAL", "ffmpeg not found");

  const tmpPath = `${filePath}.trim.mp4`;
  // Re-encode only the kept range: stream copy would snap cuts to keyframes, often seconds apart.
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    start.toFixed(3),
    "-i",
    filePath,
    "-t",
    (end - start).toFixed(3),
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    "-y",
    tmpPath,
  ];

  job.status = "processing";
  const result = await run(ffmpeg, args, {
    timeoutMs: config.downloadTimeoutMs,
    onSpawn: (child) => {
      job.child = child;
    },
  });
  job.child = null;

  if (result.code !== 0) throw new AppError("INTERNAL", "ffmpeg trim failed");

  // Replace original with trimmed
  await rm(filePath);
  await rename(tmpPath, filePath);

  return filePath;
}

async function execute(job: Job): Promise<void> {
  const { payload } = job;
  try {
    job.status = "downloading";
    job.progress = 0;
    job.dir = await mkdtemp(path.join(baseTmpDir(), DIR_PREFIX));

    const source = payload.p === "snapchat" ? await snapchatDownloadSource(payload.u) : payload.u;
    // A direct CDN file is a single format; the page-level selector can't match it.
    const format = source !== payload.u && payload.m === "video" ? "b" : payload.f;

    // Selectors like "137+140/..." download two streams before merging.
    const streams = format.split("/")[0].includes("+") ? 2 : 1;
    const seenStreams: string[] = [];
    let finalPath: string | null = null;

    const args = [
      "--format",
      format,
      "--output",
      path.join(job.dir, "%(id).80B.%(ext)s"),
      "--restrict-filenames",
      "--no-mtime",
      "--no-part",
      "--newline",
      "--progress",
      "--max-filesize",
      `${config.maxFileSizeMb}M`,
      "--progress-template",
      `download:${PROGRESS_PREFIX}%(info.format_id)s %(progress._percent_str)s`,
      "--print",
      `after_move:${FILE_PREFIX}%(filepath)s`,
      ...(payload.i > 0 ? ["--yes-playlist", "--playlist-items", String(payload.i)] : ["--no-playlist"]),
      ...modeArgs(payload.m),
    ];

    const result = await ytdlp(args, source, {
      timeoutMs: config.downloadTimeoutMs,
      onSpawn: (child) => {
        job.child = child;
      },
      onLine: (line) => {
        if (line.startsWith(PROGRESS_PREFIX)) {
          const [formatId = "", rawPct = ""] = line.slice(PROGRESS_PREFIX.length).trim().split(/\s+/);
          if (!seenStreams.includes(formatId)) seenStreams.push(formatId);
          const streamIndex = Math.min(seenStreams.indexOf(formatId), streams - 1);
          const pct = Number.parseFloat(rawPct);
          if (!Number.isFinite(pct)) return;
          const overall = ((streamIndex + pct / 100) / streams) * 100;
          job.progress = Math.max(job.progress ?? 0, Math.min(overall, 99));
          // Once the last stream lands, ffmpeg merges/converts.
          if (streamIndex === streams - 1 && pct >= 100) job.status = "processing";
        } else if (line.startsWith(FILE_PREFIX)) {
          finalPath = line.slice(FILE_PREFIX.length).trim();
        }
      },
    });
    job.child = null;

    if (result.code !== 0) throw classifyFailure(result);
    if (/max-filesize|larger than max/i.test(result.stdout + result.stderr) && !finalPath) {
      throw new AppError("TOO_LARGE", `That file is bigger than our ${config.maxFileSizeMb} MB limit.`);
    }
    if (!finalPath) throw new AppError("NO_MEDIA");

    // Never serve anything outside this job's own directory. (Runtime temp paths:
    // tell Turbopack not to trace them into the build output.)
    const resolved = path.resolve(/*turbopackIgnore: true*/ finalPath);
    if (path.dirname(resolved) !== path.resolve(/*turbopackIgnore: true*/ job.dir)) throw new AppError("INTERNAL");
    const label = payload.l === "audio" || payload.l === "best" ? "" : `-${payload.l}`;
    let finalFilePath = resolved;
    let suffix = label;
    if (job.frames && payload.m === "video") {
      job.status = "processing";
      const frames = await extractFrames(resolved, job.frames, {
        timeoutMs: config.downloadTimeoutMs,
        onSpawn: (child) => {
          job.child = child;
        },
      });
      job.child = null;
      finalFilePath = frames.filePath;
      suffix = `-${frames.suffix}`;
    } else if (job.trim && payload.m === "video") {
      finalFilePath = await trimVideo(resolved, job.trim.start, job.trim.end, job);
      suffix = `${label}-clip`;
    }

    const info = await stat(/*turbopackIgnore: true*/ finalFilePath);
    if (!info.isFile() || info.size === 0) throw new AppError("NO_MEDIA");

    const ext = path.extname(finalFilePath).slice(1).toLowerCase() || "bin";
    job.filePath = finalFilePath;
    job.fileName = `${payload.n}${suffix}.${ext}`;
    job.sizeBytes = info.size;
    job.progress = 100;
    job.status = "ready";
  } catch (err) {
    job.status = "error";
    job.error = toAppError(err);
    if (job.error.code === "INTERNAL") console.error("[yoink] job failed", job.id, err);
    await cleanup(job);
  } finally {
    job.child = null;
    job.finishedAt = Date.now();
  }
}

export type { Job };
