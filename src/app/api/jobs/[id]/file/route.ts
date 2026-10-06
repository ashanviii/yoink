import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { AppError, errorResponse } from "@/lib/errors";
import { getJob } from "@/lib/server/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  mp4: "video/mp4",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  webm: "video/webm",
  mkv: "video/x-matroska",
  jpg: "image/jpeg",
  png: "image/png",
  zip: "application/zip",
};

function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(_request: Request, ctx: RouteContext<"/api/jobs/[id]/file">) {
  try {
    const { id } = await ctx.params;
    const job = getJob(id);
    if (!job) throw new AppError("JOB_NOT_FOUND");
    if (job.status !== "ready" || !job.filePath || !job.fileName) {
      throw new AppError("BAD_REQUEST", "That download isn't ready yet.");
    }

    const info = await stat(job.filePath).catch(() => null);
    if (!info?.isFile()) throw new AppError("JOB_NOT_FOUND");

    const ext = job.fileName.split(".").pop() ?? "";
    // The file stays on disk until the job's TTL sweep so a retried/duplicated
    // browser request still succeeds.
    const stream = Readable.toWeb(createReadStream(job.filePath)) as ReadableStream<Uint8Array>;
    return new Response(stream, {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Length": String(info.size),
        "Content-Disposition": contentDisposition(job.fileName),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
