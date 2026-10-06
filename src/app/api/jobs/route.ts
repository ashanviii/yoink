import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { assertSameOrigin, noStore, readJson } from "@/lib/server/http";
import { createJob, toJobState } from "@/lib/server/jobs";
import { clientKey, limiters } from "@/lib/server/rate-limit";
import { verifyDownloadToken } from "@/lib/server/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const frameFormat = z.enum(["jpg", "png"]);

const bodySchema = z.object({
  token: z.string().max(4096),
  trim: z
    .object({ start: z.number().finite().min(0).max(86_400), end: z.number().finite().min(0).max(86_400) })
    .refine((t) => t.end - t.start >= 0.5, "Trimmed clip must be at least half a second.")
    .optional(),
  frames: z
    .discriminatedUnion("mode", [
      z.object({ mode: z.literal("single"), at: z.number().finite().min(0).max(86_400), format: frameFormat }),
      z.object({ mode: z.literal("interval"), every: z.number().finite().min(0.1).max(3_600), format: frameFormat }),
    ])
    .optional(),
});

/** Starts preparing a download. Poll GET /api/jobs/:id, then fetch /api/jobs/:id/file. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const key = clientKey(request);
    limiters.job.consume(key);

    const body = bodySchema.safeParse(await readJson(request));
    if (!body.success) throw new AppError("BAD_REQUEST");

    const { token, trim, frames } = body.data;
    if (trim && frames) throw new AppError("BAD_REQUEST", "Pick either a trim or frames, not both.");
    const payload = verifyDownloadToken(token);
    if ((trim || frames) && payload.m !== "video") throw new AppError("BAD_REQUEST", "That only works on video downloads.");
    const job = createJob(payload, key, { trim, frames });
    return Response.json(toJobState(job), { status: 202, headers: noStore });
  } catch (err) {
    return errorResponse(err);
  }
}
