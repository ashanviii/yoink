import "server-only";

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function str(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function resolveSecret(): string {
  const secret = str("YOINK_SECRET");
  if (secret) {
    if (secret.length < 32) throw new Error("YOINK_SECRET must be at least 32 characters long.");
    return secret;
  }
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("YOINK_SECRET is required in production (used to sign download tokens).");
  }
  return "dev-only-insecure-secret-change-me-please-0000";
}

let secretCache: string | undefined;

export const config = {
  get secret(): string {
    secretCache ??= resolveSecret();
    return secretCache;
  },
  /** Explicit yt-dlp executable. If unset we try `yt-dlp`, then `python -m yt_dlp`. */
  ytdlpPath: str("YTDLP_PATH"),
  /** Explicit ffmpeg executable. Defaults to the bundled ffmpeg-static binary. */
  ffmpegPath: str("FFMPEG_PATH"),
  /** Optional outbound proxy for the extractor (e.g. if a platform is blocked in your region). */
  proxy: str("YTDLP_PROXY"),
  /** Optional Netscape cookies file. Only needed for login-walled content such as Instagram Stories. */
  cookiesFile: str("YTDLP_COOKIES_FILE"),
  /** Directory for temporary download files. Defaults to the OS temp dir. */
  tmpDir: str("YOINK_TMP_DIR"),
  maxFileSizeMb: int("YOINK_MAX_FILESIZE_MB", 2048),
  maxDurationSec: int("YOINK_MAX_DURATION_SEC", 3 * 60 * 60),
  maxConcurrentJobs: int("YOINK_MAX_CONCURRENT_JOBS", 3),
  maxQueuedJobs: int("YOINK_MAX_QUEUED_JOBS", 20),
  resolveTimeoutMs: int("YOINK_RESOLVE_TIMEOUT_MS", 45_000),
  downloadTimeoutMs: int("YOINK_DOWNLOAD_TIMEOUT_MS", 15 * 60_000),
  /** How long a prepared file stays available for download. */
  fileTtlMs: int("YOINK_FILE_TTL_MS", 10 * 60_000),
  tokenTtlSec: int("YOINK_TOKEN_TTL_SEC", 60 * 60),
  /** Only trust X-Forwarded-For when running behind a proxy you control. */
  trustProxy: process.env.YOINK_TRUST_PROXY === "true",
} as const;
