import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveStatCards } from "@/components/layout/responsive-stat-cards";
import { requireRole } from "@/lib/auth/server";
import { getStaffDashboardSummary } from "@/lib/members/service";

export default async function TreasurerDashboardPage() {
  await requireRole(["TREASURER"]);
  const summary = await getStaffDashboardSummary();

  return (
    <section className="space-y-6 md:space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Treasurer
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
          Operations desk
        </h1>
      </div>

      <ResponsiveStatCards>
        <Card>
          <CardHeader>
            <CardTitle>Members tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{summary.memberCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{summary.activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{summary.pendingCount}</p>
          </CardContent>
        </Card>
      </ResponsiveStatCards>
    </section>
  );
}
