import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/server";
import { getClientDashboardSummary } from "@/lib/members/service";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ClientDashboardPage() {
  const user = await requireRole(["CLIENT"]);

  if (!user.memberId) {
    notFound();
  }

  const member = await getClientDashboardSummary(user.memberId);

  if (!member) {
    notFound();
  }

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Member portal
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
          Welcome back, {member.firstName}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>{member.memberNumber}</Badge>
          <Badge variant={member.status === "ACTIVE" ? "success" : "warning"}>
            {member.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Savings balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">
              {formatCurrency(member.savingsAccount?.balance?.toString() ?? "0")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Account opened</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatDate(member.savingsAccount?.openedAt ?? member.enrollmentDate)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Login status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {member.user?.mustChangePassword ? "Action required" : "Ready"}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
