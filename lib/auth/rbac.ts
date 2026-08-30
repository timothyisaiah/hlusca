import type { UserRole } from "@prisma/client";
import type { Session } from "next-auth";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { ApiError } from "../api";
import { authOptions } from "./options";

type RouteHandler<TParams> = (
  request: NextRequest,
  context: { params: Promise<TParams> },
  user: Session["user"],
) => Promise<Response>;

interface RouteGuardOptions {
  roles?: UserRole[];
  allowPasswordChange?: boolean;
}

export function withRouteAuth<TParams>(
  handler: RouteHandler<TParams>,
  options: RouteGuardOptions = {},
) {
  return async (request: NextRequest, context: { params: Promise<TParams> }) => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      throw new ApiError("Unauthorized.", 401, "UNAUTHORIZED");
    }

    if (session.user.mustChangePassword && !options.allowPasswordChange) {
      throw new ApiError(
        "Password change required before continuing.",
        403,
        "PASSWORD_CHANGE_REQUIRED",
      );
    }

    if (options.roles && !options.roles.includes(session.user.role)) {
      throw new ApiError("Forbidden.", 403, "FORBIDDEN");
    }

    return handler(request, context, session.user);
  };
}

export function assertCanAccessMember(
  user: {
    role: UserRole;
    memberId: string | null;
  },
  memberId: string,
) {
  if (user.role === "CLIENT" && user.memberId !== memberId) {
    throw new ApiError("Forbidden.", 403, "FORBIDDEN");
  }
}
