import "server-only";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";

export interface RunOptions {
  timeoutMs: number;
  signal?: AbortSignal;
  /** Called for each stdout/stderr line as it arrives. */
  onLine?: (line: string, stream: "stdout" | "stderr") => void;
  /** Cap on buffered stdout to protect memory. */
  maxStdoutBytes?: number;
  onSpawn?: (child: ChildProcess) => void;
}

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  aborted: boolean;
}

/** Kills a process and its children (yt-dlp spawns ffmpeg). */
export function killTree(child: ChildProcess): void {
  if (child.exitCode !== null || child.pid === undefined) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
  } else {
    child.kill("SIGKILL");
  }
}

/** Runs a binary with an argument array (never a shell string). */
export function run(command: string, args: readonly string[], options: RunOptions): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
    });
    options.onSpawn?.(child);

    const maxStdout = options.maxStdoutBytes ?? 64 * 1024 * 1024;
    const stdoutChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderr = "";
    let timedOut = false;
    let aborted = false;
    const pending = { stdout: "", stderr: "" };

    const emitLines = (stream: "stdout" | "stderr", chunk: string) => {
      if (!options.onLine) return;
      pending[stream] += chunk;
      const lines = pending[stream].split(/\r?\n|\r/);
      pending[stream] = lines.pop() ?? "";
      for (const line of lines) if (line) options.onLine(line, stream);
    };

    child.stdout!.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxStdout) {
        killTree(child);
        return;
      }
      stdoutChunks.push(chunk);
      emitLines("stdout", chunk.toString("utf8"));
    });
    child.stderr!.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      if (stderr.length < 256 * 1024) stderr += text;
      emitLines("stderr", text);
    });

    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, options.timeoutMs);

    const onAbort = () => {
      aborted = true;
      killTree(child);
    };
    if (options.signal?.aborted) onAbort();
    options.signal?.addEventListener("abort", onAbort, { once: true });

    child.on("error", (err) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      for (const stream of ["stdout", "stderr"] as const) {
        if (pending[stream] && options.onLine) options.onLine(pending[stream], stream);
      }
      resolve({
        code,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr,
        timedOut,
        aborted,
      });
    });
  });
}
