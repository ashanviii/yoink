import "server-only";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { AppError } from "@/lib/errors";
import { MAX_EXTRACT_FRAMES, type FrameFormat, type FrameParams } from "@/lib/media-types";
import { run, type RunOptions } from "./process";
import { ffmpegLocation } from "./ytdlp";
import { writeZip } from "./zip";

export interface ExtractedFrames {
  filePath: string;
  /** Filename suffix after the media stem, without extension, e.g. "frame-3.20s". */
  suffix: string;
}

type ExtractOptions = Pick<RunOptions, "timeoutMs" | "onSpawn">;

function encoderArgs(format: FrameFormat): string[] {
  // JPEG q 2 is near-lossless; PNG is lossless already.
  return format === "jpg" ? ["-q:v", "2"] : [];
}

async function exists(file: string): Promise<boolean> {
  const info = await stat(file).catch(() => null);
  return !!info?.isFile() && info.size > 0;
}

async function ffmpeg(args: string[], options: ExtractOptions): Promise<void> {
  const bin = ffmpegLocation();
  if (!bin) throw new AppError("INTERNAL", "ffmpeg not found");
  const result = await run(bin, ["-hide_banner", "-loglevel", "error", ...args], options);
  if (result.code !== 0) throw new AppError("INTERNAL", "ffmpeg frame extraction failed", { cause: result.stderr });
}

async function singleFrame(video: string, at: number, format: FrameFormat, options: ExtractOptions): Promise<ExtractedFrames> {
  const out = path.join(path.dirname(video), `frame.${format}`);
  // Input seeking decodes from the previous keyframe up to `at`, so the frame is exact.
  await ffmpeg(["-ss", at.toFixed(3), "-i", video, "-map", "0:v:0", "-frames:v", "1", ...encoderArgs(format), "-y", out], options);
  if (!(await exists(out))) {
    // Seeking past the last frame yields nothing; fall back to the final frame.
    await ffmpeg(["-sseof", "-1", "-i", video, "-map", "0:v:0", "-update", "1", ...encoderArgs(format), "-y", out], options);
  }
  if (!(await exists(out))) throw new AppError("NO_MEDIA", "Couldn't grab that frame. Try a slightly different moment.");
  return { filePath: out, suffix: `frame-${at.toFixed(2)}s` };
}

async function frameSet(video: string, every: number, format: FrameFormat, options: ExtractOptions): Promise<ExtractedFrames> {
  const dir = path.dirname(video);
  const framesDir = path.join(dir, "frames");
  await mkdir(framesDir);
  await ffmpeg(
    [
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
      path.join(framesDir, `%04d.${format}`),
    ],
    options,
  );

  const files = (await readdir(framesDir)).filter((name) => name.endsWith(`.${format}`)).sort();
  if (files.length === 0) throw new AppError("NO_MEDIA", "Couldn't grab any frames from that video.");

  const zipPath = path.join(dir, "frames.zip");
  await writeZip(
    zipPath,
    files.map((file, index) => ({
      name: `frame-${String(index + 1).padStart(3, "0")}_${(index * every).toFixed(2)}s.${format}`,
      path: path.join(framesDir, file),
    })),
  );
  await rm(framesDir, { recursive: true, force: true });
  return { filePath: zipPath, suffix: `frames-every-${every}s` };
}

/** Turns a downloaded video into the requested still(s), deleting the video afterwards. */
export async function extractFrames(video: string, params: FrameParams, options: ExtractOptions): Promise<ExtractedFrames> {
  try {
    return params.mode === "single"
      ? await singleFrame(video, params.at, params.format, options)
      : await frameSet(video, params.every, params.format, options);
  } finally {
    await rm(video, { force: true }).catch(() => undefined);
  }
}
