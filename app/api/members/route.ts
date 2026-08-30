import type { NextRequest } from "next/server";

import { handleRouteError, json } from "@/lib/api";
import { getRequestMetadata } from "@/lib/audit/request";
import { withRouteAuth } from "@/lib/auth/rbac";
import { enrollMember, listMembers } from "@/lib/members/service";
import { memberEnrollmentSchema } from "@/lib/members/schemas";

const getMembersHandler = withRouteAuth(
  async () => {
    const members = await listMembers();
    return json(members);
  },
  {
    roles: ["ADMIN"],
  },
);

const postMemberHandler = withRouteAuth(
  async (request, _context, user) => {
    const payload = memberEnrollmentSchema.parse(await request.json());
    const result = await enrollMember(payload, user, getRequestMetadata(request));
    return json(result);
  },
  {
    roles: ["ADMIN"],
  },
);

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> },
) {
  try {
    return await getMembersHandler(request, context);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> },
) {
  try {
    return await postMemberHandler(request, context);
  } catch (error) {
    return handleRouteError(error);
  }
}
