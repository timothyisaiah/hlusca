import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

import { authOptions } from "./options";
import { getDashboardPathForRole } from "../dashboard/navigation";

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function requireCurrentUser(options?: {
  allowPasswordChange?: boolean;
}) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  if (session.user.mustChangePassword && !options?.allowPasswordChange) {
    redirect("/change-password");
  }

  return session.user;
}

export async function redirectSignedInUser() {
  const session = await getCurrentSession();

  if (!session?.user) {
    return null;
  }

  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  redirect(getDashboardPathForRole(session.user.role));
}

export async function requireRole(
  roles: UserRole[],
  options?: {
    allowPasswordChange?: boolean;
  },
) {
  const user = await requireCurrentUser(options);

  if (!roles.includes(user.role)) {
    redirect(getDashboardPathForRole(user.role));
  }

  return user;
}

export async function requireMemberRole(memberId: string) {
  const user = await requireCurrentUser();

  if (user.role !== "CLIENT" || user.memberId !== memberId) {
    notFound();
  }

  return user;
}
