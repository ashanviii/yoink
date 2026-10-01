import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { assertSameOrigin, noStore, readJson } from "@/lib/server/http";
import { createJob, toJobState } from "@/lib/server/jobs";
import { clientKey, limiters } from "@/lib/server/rate-limit";
import { verifyDownloadToken } from "@/lib/server/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ token: z.string().max(4096) });

/** Starts preparing a download. Poll GET /api/jobs/:id, then fetch /api/jobs/:id/file. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const key = clientKey(request);
    limiters.job.consume(key);

    const body = bodySchema.safeParse(await readJson(request));
    if (!body.success) throw new AppError("BAD_REQUEST");

    const payload = verifyDownloadToken(body.data.token);
    const job = createJob(payload, key);
    return Response.json(toJobState(job), { status: 202, headers: noStore });
  } catch (err) {
    return errorResponse(err);
  }
}
