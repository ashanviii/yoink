import type { FFmpeg } from "@ffmpeg/ffmpeg";

/**
 * ffmpeg compiled to WebAssembly, running in a worker. The core and its worker are
 * served from /ffmpeg (copied out of node_modules by scripts/copy-ffmpeg.mjs) rather
 * than bundled, since the worker loads the core with a runtime import().
 *
 * Where the page is cross-origin isolated (see next.config.ts), the multi-threaded core
 * is used: encoding is several times faster. It hangs if ffmpeg picks its own thread
 * counts, so every command gets explicit ones, and a stalled or failed multi-threaded
 * job is retried once on the single-threaded core.
 *
 * There's one instance, so jobs take turns; it loads on first use (~32 MB, then cached).
 */

const VERSION = process.env.NEXT_PUBLIC_FFMPEG_VERSION ?? "0";
/** Threads per encoder; the core's worker pool is small, and more barely helps. */
const ENCODE_THREADS = 4;
const DECODE_THREADS = 2;
/** With no progress or log output for this long, an ffmpeg run is treated as hung. */
const STALL_MS = { multi: 25_000, single: 90_000 };

type Mode = "multi" | "single";

let instance: { mode: Mode; ffmpeg: Promise<FFmpeg> } | null = null;
let multiFailed = false;
let tail: Promise<void> = Promise.resolve();
let active = 0;
let jobSeq = 0;

/** Fraction (0–1) of the core download, for "getting ready" progress. */
const loadListeners = new Set<(fraction: number | null) => void>();

const canMultiThread = () =>
  !multiFailed && typeof crossOriginIsolated !== "undefined" && crossOriginIsolated && (navigator.hardwareConcurrency ?? 1) > 2;

/** Downloads the wasm with progress and hands ffmpeg a blob URL of it. */
async function fetchWasm(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status} for ${url}`);
  // The server compresses it, so Content-Length is the compressed size; it's still a fair guide.
  const total = Number(response.headers.get("content-length")) || 0;
  const encoded = !!response.headers.get("content-encoding");
  const expected = encoded ? 0 : total;
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let loaded = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value as Uint8Array<ArrayBuffer>);
    loaded += value.length;
    // Without a usable length, the uncompressed size (~32 MB) is close enough for a bar.
    const fraction = Math.min(0.99, loaded / (expected || 32 * 1024 * 1024));
    for (const listener of loadListeners) listener(fraction);
  }
  return URL.createObjectURL(new Blob(parts, { type: "application/wasm" }));
}

function load(): { mode: Mode; ffmpeg: Promise<FFmpeg> } {
  const mode: Mode = canMultiThread() ? "multi" : "single";
  if (instance && instance.mode === mode) return instance;
  if (instance) terminate();
  const base = `${window.location.origin}/ffmpeg${mode === "multi" ? "/mt" : ""}`;
  const v = `?v=${VERSION}`;
  const ffmpeg = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const ffmpeg = new FFmpeg();
    const wasmURL = await fetchWasm(`${base}/ffmpeg-core.wasm${v}`);
    try {
      await ffmpeg.load({
        coreURL: `${base}/ffmpeg-core.js${v}`,
        wasmURL,
        ...(mode === "multi" ? { workerURL: `${base}/ffmpeg-core.worker.js${v}` } : {}),
        classWorkerURL: `${window.location.origin}/ffmpeg/worker.js${v}`,
      });
    } finally {
      URL.revokeObjectURL(wasmURL);
    }
    return ffmpeg;
  })().catch((err) => {
    if (instance?.ffmpeg === ffmpeg) instance = null;
    if (mode === "multi") multiFailed = true;
    throw new Error("Couldn't start the video processor in your browser.", { cause: err });
  });
  instance = { mode, ffmpeg };
  return instance;
}

function terminate(): void {
  const current = instance;
  instance = null;
  current?.ffmpeg.then((ffmpeg) => ffmpeg.terminate(), () => undefined);
}

/** Starts fetching the processor early, e.g. while the media downloads. */
export function preloadFFmpeg(): void {
  load().ffmpeg.catch(() => undefined);
}

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

/**
 * Pins thread counts: decoder threads before each input, encoder threads before the
 * output (always the last argument here). Left to "auto", the multi-threaded core
 * asks for more threads than its pool has and never finishes.
 */
function withThreads(args: string[]): string[] {
  const out: string[] = ["-filter_threads", "1"];
  for (const arg of args.slice(0, -1)) {
    if (arg === "-i") out.push("-threads", String(DECODE_THREADS));
    out.push(arg);
  }
  out.push("-threads", String(ENCODE_THREADS), args.at(-1)!);
  return out;
}

class StalledError extends Error {}

/** Marks a failure that happened on the multi-threaded core. */
class MultiThreadError extends Error {}

export interface FFmpegJob {
  /** Directory holding the mounted inputs, by the names given. */
  inputDir: string;
  /** Scratch directory for outputs. */
  outDir: string;
  /**
   * Runs ffmpeg; throws (with its last log lines) on a non-zero exit. With `outputSec`, the
   * expected length of the output, progress is reported to the job's `onProgress`.
   */
  exec(args: string[], outputSec?: number): Promise<void>;
  /** True when `path` exists and isn't empty. */
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<Uint8Array<ArrayBuffer>>;
  listDir(path: string): Promise<string[]>;
}

interface JobOptions {
  signal?: AbortSignal;
  /** Fires when another job holds ffmpeg and this one has to queue. */
  onWait?: () => void;
  /** Fires while the processor itself downloads (fraction of it, or null when unknown). */
  onLoading?: (fraction: number | null) => void;
  /** Fraction (0–1) of the current exec, when it was given an output length. */
  onProgress?: (fraction: number) => void;
}

/**
 * Runs `task` with exclusive use of ffmpeg. Inputs are mounted read-only (WORKERFS),
 * so large Blobs aren't copied into wasm memory. Aborting kills the worker mid-run.
 */
export async function withFFmpeg<T>(
  inputs: { name: string; data: Blob }[],
  task: (job: FFmpegJob) => Promise<T>,
  options: JobOptions = {},
): Promise<T> {
  const { signal, onWait } = options;
  const previous = tail;
  let release!: () => void;
  const done = new Promise<void>((resolve) => (release = resolve));
  // The next job waits for this one even if this one gives up while queued.
  tail = previous.then(() => done);
  if (active++ > 0) onWait?.();

  try {
    await abortable(previous, signal);
    try {
      return await runJob(inputs, task, options);
    } catch (err) {
      if (signal?.aborted || !(err instanceof MultiThreadError)) throw err;
      // The multi-threaded core stalled or crashed (often memory on big files): retry single-threaded.
      console.warn("[yoink] multi-threaded ffmpeg failed, retrying single-threaded", err);
      multiFailed = true;
      terminate();
      return await runJob(inputs, task, options);
    }
  } finally {
    active -= 1;
    release();
  }
}

async function runJob<T>(
  inputs: { name: string; data: Blob }[],
  task: (job: FFmpegJob) => Promise<T>,
  { signal, onLoading, onProgress }: JobOptions,
): Promise<T> {
  const { mode, ffmpeg: loading } = load();
  if (onLoading) loadListeners.add(onLoading);
  let ffmpeg: FFmpeg;
  try {
    ffmpeg = await abortable(loading, signal);
  } catch (err) {
    if (mode === "multi" && !signal?.aborted) throw new MultiThreadError("multi-threaded ffmpeg didn't load", { cause: err });
    throw err;
  } finally {
    if (onLoading) loadListeners.delete(onLoading);
  }

  const root = `/job-${++jobSeq}`;
  const inputDir = `${root}/in`;
  const outDir = `${root}/out`;
  const log: string[] = [];
  let lastBeat = Date.now();
  let outputSec: number | undefined;
  const onLog = ({ message }: { message: string }) => {
    lastBeat = Date.now();
    log.push(message);
    if (log.length > 30) log.shift();
  };
  const onFrame = ({ time }: { time: number }) => {
    lastBeat = Date.now();
    // `time` is the output position in microseconds; ffmpeg's own `progress` is unreliable with seeks.
    // A job can open with a "no timestamp" sentinel (~9.2e18), which would pin the bar at the end.
    const sec = time / 1e6;
    if (outputSec && sec > 0 && sec <= outputSec * 2) onProgress?.(Math.min(1, sec / outputSec));
  };
  const onAbort = () => terminate();

  signal?.addEventListener("abort", onAbort, { once: true });
  ffmpeg.on("log", onLog);
  ffmpeg.on("progress", onFrame);
  try {
    await ffmpeg.createDir(root);
    await ffmpeg.createDir(inputDir);
    await ffmpeg.createDir(outDir);
    await ffmpeg.mount("WORKERFS" as Parameters<FFmpeg["mount"]>[0], { blobs: inputs }, inputDir);

    return await task({
      inputDir,
      outDir,
      async exec(args, expectedSec) {
        log.length = 0;
        outputSec = expectedSec && expectedSec > 0 ? expectedSec : undefined;
        lastBeat = Date.now();
        // "-stats" keeps progress reports coming (they're the watchdog's heartbeat) even with quiet logs.
        const full = ["-hide_banner", "-loglevel", "error", "-stats", ...(mode === "multi" ? withThreads(args) : args)];
        let watchdog: ReturnType<typeof setInterval> | undefined;
        const stalled = new Promise<never>((_, reject) => {
          watchdog = setInterval(() => {
            if (Date.now() - lastBeat < STALL_MS[mode]) return;
            terminate();
            reject(new StalledError(`ffmpeg made no progress for ${STALL_MS[mode] / 1000}s`));
          }, 2_000);
        });
        try {
          const code = await Promise.race([ffmpeg.exec(full), stalled]);
          if (code !== 0) throw new Error(`ffmpeg exited with ${code}: ${log.join("\n").slice(-1000)}`);
        } catch (err) {
          if (signal?.aborted) throw err;
          // A crash (e.g. "memory access out of bounds") leaves the instance broken for every later
          // job, so start the next one on a fresh instance.
          if (!(err instanceof Error && err.message.startsWith("ffmpeg exited with"))) terminate();
          if (mode === "multi") throw new MultiThreadError("multi-threaded ffmpeg failed", { cause: err });
          throw err;
        } finally {
          clearInterval(watchdog);
        }
      },
      async exists(path) {
        const dir = path.slice(0, path.lastIndexOf("/"));
        const name = path.slice(path.lastIndexOf("/") + 1);
        const entries = await ffmpeg.listDir(dir);
        if (!entries.some((entry) => entry.name === name && !entry.isDir)) return false;
        return (await ffmpeg.readFile(path)).length > 0;
      },
      readFile: async (path) => (await ffmpeg.readFile(path)) as Uint8Array<ArrayBuffer>,
      listDir: async (path) =>
        (await ffmpeg.listDir(path)).filter((entry) => !entry.isDir).map((entry) => entry.name).sort(),
    });
  } finally {
    signal?.removeEventListener("abort", onAbort);
    ffmpeg.off("log", onLog);
    ffmpeg.off("progress", onFrame);
    // A terminated instance (abort, stall) has nothing left to clean.
    if (instance && (await instance.ffmpeg.catch(() => null)) === ffmpeg) await cleanup(ffmpeg, root, inputDir, outDir);
  }
}

/** Frees the job's files; wasm memory doesn't shrink, but it gets reused. */
async function cleanup(ffmpeg: FFmpeg, root: string, inputDir: string, outDir: string): Promise<void> {
  try {
    await ffmpeg.unmount(inputDir);
  } catch {
    // never mounted
  }
  const removeTree = async (dir: string) => {
    const entries = await ffmpeg.listDir(dir).catch(() => []);
    for (const entry of entries) {
      if (entry.name === "." || entry.name === "..") continue;
      const path = `${dir}/${entry.name}`;
      if (entry.isDir) await removeTree(path);
      else await ffmpeg.deleteFile(path).catch(() => undefined);
    }
    await ffmpeg.deleteDir(dir).catch(() => undefined);
  };
  await removeTree(outDir);
  await ffmpeg.deleteDir(inputDir).catch(() => undefined);
  await ffmpeg.deleteDir(root).catch(() => undefined);
}
