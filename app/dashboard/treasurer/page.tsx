import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/server";
import { getStaffDashboardSummary } from "@/lib/members/service";

export default async function TreasurerDashboardPage() {
  await requireRole(["TREASURER"]);
  const summary = await getStaffDashboardSummary();

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Treasurer
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
          Operations desk
        </h1>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
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
      </div>
    </section>
  );
}
