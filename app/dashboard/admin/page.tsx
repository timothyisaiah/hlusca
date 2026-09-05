import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveStatCards } from "@/components/layout/responsive-stat-cards";
import { requireRole } from "@/lib/auth/server";
import { getAdminOverview } from "@/lib/members/service";

export default async function AdminDashboardPage() {
  await requireRole(["ADMIN"]);
  const overview = await getAdminOverview();

  return (
    <section className="space-y-6 md:space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Administrator
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl">
          Enrollment, governance, and controls
        </h1>
        <p className="max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">
          Manage membership, configure loan products, and keep approval rules current.
        </p>
      </div>

      <ResponsiveStatCards>
        <Card>
          <CardHeader>
            <CardTitle>Total members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums md:text-4xl">{overview.memberCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending activation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums md:text-4xl">{overview.pendingMemberCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Board approval threshold</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums md:text-4xl">
              UGX {overview.boardThreshold.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </ResponsiveStatCards>
    </section>
  );
}
