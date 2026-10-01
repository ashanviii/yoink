import { AppError, errorResponse } from "@/lib/errors";
import { noStore } from "@/lib/server/http";
import { getJob, toJobState } from "@/lib/server/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  try {
    const { id } = await ctx.params;
    const job = getJob(id);
    if (!job) throw new AppError("JOB_NOT_FOUND");
    return Response.json(toJobState(job), { headers: noStore });
  } catch (err) {
    return errorResponse(err);
  }
}
