import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/server";
import { getDashboardPathForRole } from "@/lib/dashboard/navigation";

export default async function Home() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  redirect(getDashboardPathForRole(session.user.role));
}
