import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/server";
import { getStaffDashboardSummary } from "@/lib/members/service";

export default async function BoardDashboardPage() {
  await requireRole(["BOARD"]);
  const summary = await getStaffDashboardSummary();

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Board
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
          Oversight snapshot
        </h1>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total members</CardTitle>
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
            <CardTitle>Pending activation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{summary.pendingCount}</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
