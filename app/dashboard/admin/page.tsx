import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/server";
import { getAdminOverview } from "@/lib/members/service";

export default async function AdminDashboardPage() {
  await requireRole(["ADMIN"]);
  const overview = await getAdminOverview();

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Administrator
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
          Enrollment, governance, and controls
        </h1>
        <p className="max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">
          Phase 1 centers the platform around safe onboarding and strong operational visibility.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{overview.memberCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending activation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{overview.pendingMemberCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Board approval threshold</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">
              UGX {overview.boardThreshold.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
