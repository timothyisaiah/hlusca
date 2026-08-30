import type { NextRequest } from "next/server";

import { handleRouteError, json } from "@/lib/api";
import { getRequestMetadata } from "@/lib/audit/request";
import { requestPasswordReset } from "@/lib/members/service";
import { passwordResetRequestSchema } from "@/lib/members/schemas";

export async function POST(request: NextRequest) {
  try {
    const payload = passwordResetRequestSchema.parse(await request.json());
    const result = await requestPasswordReset(payload, getRequestMetadata(request));

    return json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
