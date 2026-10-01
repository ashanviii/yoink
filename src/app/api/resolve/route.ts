import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { URL_ERROR_MESSAGES, parseMediaUrl } from "@/lib/url";
import { assertSameOrigin, noStore, readJson } from "@/lib/server/http";
import { clientKey, limiters } from "@/lib/server/rate-limit";
import { resolveMedia } from "@/lib/server/resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ url: z.string().max(2048) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    limiters.resolve.consume(clientKey(request));

    const body = bodySchema.safeParse(await readJson(request));
    if (!body.success) throw new AppError("BAD_REQUEST", "Send a JSON body like { \"url\": \"…\" }.");

    const parsed = parseMediaUrl(body.data.url);
    if (!parsed.ok) throw new AppError("INVALID_URL", URL_ERROR_MESSAGES[parsed.reason]);

    const media = await resolveMedia(parsed.value);
    return Response.json(media, { headers: noStore });
  } catch (err) {
    return errorResponse(err);
  }
}
