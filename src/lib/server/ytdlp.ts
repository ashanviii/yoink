import "server-only";
import ffmpegStatic from "ffmpeg-static";
import { AppError } from "@/lib/errors";
import { config } from "./config";
import { run, type RunOptions, type RunResult } from "./process";

interface Command {
  bin: string;
  prefix: string[];
}

let commandPromise: Promise<Command> | undefined;

async function probe(command: Command): Promise<boolean> {
  try {
    const result = await run(command.bin, [...command.prefix, "--version"], { timeoutMs: 15_000 });
    return result.code === 0 && /\d{4}\.\d{2}\.\d{2}/.test(result.stdout);
  } catch {
    return false;
  }
}

/** Finds a working yt-dlp invocation once per process. */
function getCommand(): Promise<Command> {
  commandPromise ??= (async () => {
    const candidates: Command[] = config.ytdlpPath
      ? [{ bin: config.ytdlpPath, prefix: [] }]
      : [
          { bin: "yt-dlp", prefix: [] },
          { bin: "python3", prefix: ["-m", "yt_dlp"] },
          { bin: "python", prefix: ["-m", "yt_dlp"] },
          { bin: "py", prefix: ["-m", "yt_dlp"] },
        ];
    for (const candidate of candidates) {
      if (await probe(candidate)) return candidate;
    }
    commandPromise = undefined; // allow a retry after the operator installs it
    throw new Error("yt-dlp was not found. Install it (pip install \"yt-dlp[default,curl-cffi]\") or set YTDLP_PATH.");
  })();
  return commandPromise;
}

export function ffmpegLocation(): string | null {
  return config.ffmpegPath ?? ffmpegStatic ?? null;
}

/** Flags applied to every invocation. User input never reaches these. */
function baseArgs(): string[] {
  const args = [
    "--ignore-config",
    "--no-warnings",
    "--color",
    "never",
    "--socket-timeout",
    "20",
    "--retries",
    "3",
    "--fragment-retries",
    "3",
    // YouTube needs a JS runtime to solve player challenges; reuse our own Node.
    "--js-runtimes",
    `node:${process.execPath}`,
  ];
  const ffmpeg = ffmpegLocation();
  if (ffmpeg) args.push("--ffmpeg-location", ffmpeg);
  if (config.proxy) args.push("--proxy", config.proxy);
  if (config.cookiesFile) args.push("--cookies", config.cookiesFile);
  return args;
}

/**
 * Runs yt-dlp. `url` always goes last after `--` so it can never be parsed as
 * an option, even though it has already been validated and canonicalised.
 */
export async function ytdlp(args: readonly string[], url: string, options: RunOptions): Promise<RunResult> {
  const command = await getCommand();
  return run(command.bin, [...command.prefix, ...baseArgs(), ...args, "--", url], options);
}

const ERROR_PATTERNS: Array<[RegExp, ConstructorParameters<typeof AppError>[0]]> = [
  [/private video|this account is private|is private|private\b.*\baccount/i, "PRIVATE"],
  [/sign in to confirm your age|age[- ]restricted|inappropriate for some users/i, "AGE_RESTRICTED"],
  [/sign in to confirm you.?re not a bot|http error 429|too many requests|rate[- ]limit/i, "UPSTREAM_BLOCKED"],
  [/login required|requires? (a )?log ?in|cookies? (are|is) (needed|required)|use --cookies|authentication|log in to/i, "LOGIN_REQUIRED"],
  [/not available in your country|geo.?restrict|blocked it in your country/i, "GEO_BLOCKED"],
  [/drm protected|this video is drm/i, "DRM"],
  [/is live|live event will begin|premieres in|is_live|is a live/i, "LIVE"],
  [/there is no video in this post|no video formats found|no media found|requested format is not available|no video could be found/i, "NO_MEDIA"],
  [/file is larger than max-filesize|larger than max/i, "TOO_LARGE"],
  [/(video|content|post|media) (is )?(no longer |currently )?unavailable|has been removed|does not exist|not found|http error 404|unable to extract|content isn.?t available|post may have been removed|this page isn.?t available/i, "NOT_FOUND"],
  [/timed out|connection reset|temporarily unavailable|unable to download webpage|http error 5\d\d|transporterror/i, "UPSTREAM_TIMEOUT"],
];

/** Maps yt-dlp stderr onto a user-facing error. */
export function classifyFailure(result: RunResult): AppError {
  if (result.timedOut) return new AppError("UPSTREAM_TIMEOUT");
  const errorLines = result.stderr
    .split(/\r?\n/)
    .filter((line) => line.startsWith("ERROR"))
    .join("\n");
  const haystack = errorLines || result.stderr;
  for (const [pattern, code] of ERROR_PATTERNS) {
    if (pattern.test(haystack)) return new AppError(code, undefined, { cause: haystack });
  }
  console.error("[yoink] unclassified yt-dlp failure:", haystack.slice(-2000));
  return new AppError("INTERNAL", "We couldn't process that link. Try again, or try a different link.", {
    cause: haystack,
  });
}
