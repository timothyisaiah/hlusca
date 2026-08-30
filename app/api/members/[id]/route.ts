import type { NextRequest } from "next/server";

import { handleRouteError, json } from "@/lib/api";
import { getRequestMetadata } from "@/lib/audit/request";
import { assertCanAccessMember, withRouteAuth } from "@/lib/auth/rbac";
import { getMemberById, updateMemberProfile } from "@/lib/members/service";
import {
  adminMemberUpdateSchema,
  selfMemberUpdateSchema,
} from "@/lib/members/schemas";

const getMemberHandler = withRouteAuth<{ id: string }>(async (_request, context, user) => {
  const { id } = await context.params;

  if (user.role === "CLIENT") {
    assertCanAccessMember(user, id);
  }

  const member = await getMemberById(id);
  return json(member);
});

const patchMemberHandler = withRouteAuth<{ id: string }>(async (request, context, user) => {
  const { id } = await context.params;

  if (user.role === "CLIENT") {
    assertCanAccessMember(user, id);
    const payload = selfMemberUpdateSchema.parse(await request.json());
    const updatedMember = await updateMemberProfile(
      id,
      payload,
      user,
      getRequestMetadata(request),
    );
    return json(updatedMember);
  }

  if (user.role !== "ADMIN") {
    return json(
      {
        error: "Forbidden.",
      },
      { status: 403 },
    );
  }

  const payload = adminMemberUpdateSchema.parse(await request.json());
  const updatedMember = await updateMemberProfile(
    id,
    payload,
    user,
    getRequestMetadata(request),
  );

  return json(updatedMember);
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    return await getMemberHandler(request, context);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    return await patchMemberHandler(request, context);
  } catch (error) {
    return handleRouteError(error);
  }
}
