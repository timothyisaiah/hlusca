import type { NextRequest } from "next/server";

import { handleRouteError, json } from "@/lib/api";
import { getRequestMetadata } from "@/lib/audit/request";
import { confirmPasswordReset } from "@/lib/members/service";
import { passwordResetConfirmSchema } from "@/lib/members/schemas";

export async function POST(request: NextRequest) {
  try {
    const payload = passwordResetConfirmSchema.parse(await request.json());
    await confirmPasswordReset(payload, getRequestMetadata(request));

    return json({
      success: true,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
