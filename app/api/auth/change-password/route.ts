import type { NextRequest } from "next/server";

import { handleRouteError, json } from "@/lib/api";
import { getRequestMetadata } from "@/lib/audit/request";
import { withRouteAuth } from "@/lib/auth/rbac";
import { changePassword } from "@/lib/members/service";
import { changePasswordSchema } from "@/lib/members/schemas";

const changePasswordHandler = withRouteAuth(
  async (request, _context, user) => {
    const payload = changePasswordSchema.parse(await request.json());
    await changePassword(user.id, payload, getRequestMetadata(request));

    return json({
      success: true,
    });
  },
  {
    allowPasswordChange: true,
  },
);

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> },
) {
  try {
    return await changePasswordHandler(request, context);
  } catch (error) {
    return handleRouteError(error);
  }
}
