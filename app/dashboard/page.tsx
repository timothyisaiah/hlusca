import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/server";
import { getDashboardPathForRole } from "@/lib/dashboard/navigation";

export default async function DashboardIndexPage() {
  const user = await requireCurrentUser();
  redirect(getDashboardPathForRole(user.role));
}
