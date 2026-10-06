import type { FFmpeg } from "@ffmpeg/ffmpeg";

/**
 * ffmpeg compiled to WebAssembly, running in a worker. The core and its worker are
 * served from /ffmpeg (copied out of node_modules by scripts/copy-ffmpeg.mjs) rather
 * than bundled, since the worker loads the core with a runtime import().
 *
 * There's one instance, so jobs take turns; it loads on first use (~30 MB, then cached).
 */

let instance: Promise<FFmpeg> | null = null;
let tail: Promise<void> = Promise.resolve();
let active = 0;
let jobSeq = 0;

function load(): Promise<FFmpeg> {
  instance ??= (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const ffmpeg = new FFmpeg();
    const base = `${window.location.origin}/ffmpeg`;
    await ffmpeg.load({
      coreURL: `${base}/ffmpeg-core.js`,
      wasmURL: `${base}/ffmpeg-core.wasm`,
      classWorkerURL: `${base}/worker.js`,
    });
    return ffmpeg;
  })().catch((err) => {
    instance = null;
    throw new Error("Couldn't start the video processor in your browser.", { cause: err });
  });
  return instance;
}

/** Starts fetching the processor early, e.g. while the media downloads. */
export function preloadFFmpeg(): void {
  load().catch(() => undefined);
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

export interface FFmpegJob {
  /** Directory holding the mounted inputs, by the names given. */
  inputDir: string;
  /** Scratch directory for outputs. */
  outDir: string;
  /** Runs ffmpeg; throws (with its last log lines) on a non-zero exit. */
  exec(args: string[]): Promise<void>;
  /** True when `path` exists and isn't empty. */
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<Uint8Array<ArrayBuffer>>;
  listDir(path: string): Promise<string[]>;
}

/**
 * Runs `task` with exclusive use of ffmpeg. Inputs are mounted read-only (WORKERFS),
 * so large Blobs aren't copied into wasm memory. `onWait` fires when another job
 * holds ffmpeg and this one has to queue. Aborting kills the worker mid-run.
 */
export async function withFFmpeg<T>(
  inputs: { name: string; data: Blob }[],
  task: (job: FFmpegJob) => Promise<T>,
  { signal, onWait }: { signal?: AbortSignal; onWait?: () => void } = {},
): Promise<T> {
  const previous = tail;
  let release!: () => void;
  const done = new Promise<void>((resolve) => (release = resolve));
  // The next job waits for this one even if this one gives up while queued.
  tail = previous.then(() => done);
  if (active++ > 0) onWait?.();

  try {
    await abortable(previous, signal);
    const ffmpeg = await abortable(load(), signal);
    const root = `/job-${++jobSeq}`;
    const inputDir = `${root}/in`;
    const outDir = `${root}/out`;
    const log: string[] = [];
    const onLog = ({ message }: { message: string }) => {
      log.push(message);
      if (log.length > 30) log.shift();
    };
    const onAbort = () => {
      ffmpeg.terminate();
      instance = null;
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    ffmpeg.on("log", onLog);
    try {
      await ffmpeg.createDir(root);
      await ffmpeg.createDir(inputDir);
      await ffmpeg.createDir(outDir);
      await ffmpeg.mount("WORKERFS" as Parameters<FFmpeg["mount"]>[0], { blobs: inputs }, inputDir);

      return await task({
        inputDir,
        outDir,
        async exec(args) {
          log.length = 0;
          const code = await ffmpeg.exec(["-hide_banner", "-loglevel", "error", ...args]);
          if (code !== 0) throw new Error(`ffmpeg exited with ${code}: ${log.join("\n").slice(-1000)}`);
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
      if (!signal?.aborted) await cleanup(ffmpeg, root, inputDir, outDir);
    }
  } finally {
    active -= 1;
    release();
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
