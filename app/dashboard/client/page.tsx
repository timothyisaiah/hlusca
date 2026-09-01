import { notFound } from "next/navigation";

import { ActivityDonut } from "@/components/savings/activity-donut";
import { MemberTransactionLog } from "@/components/savings/member-transaction-log";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveStatCards } from "@/components/layout/responsive-stat-cards";
import { requireRole } from "@/lib/auth/server";
import { getClientSavingsDashboard } from "@/lib/savings/service";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export default async function ClientDashboardPage() {
  const user = await requireRole(["CLIENT"]);

  if (!user.memberId) {
    notFound();
  }

  const dashboard = await getClientSavingsDashboard(user.memberId);
  const { member, ledger } = dashboard;

  return (
    <section className="space-y-6 md:space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Member portal
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl">
          Welcome back, {member.firstName}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>{member.memberNumber}</Badge>
          <Badge variant={member.status === "ACTIVE" ? "success" : "warning"}>
            {member.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#ffffff,#f1efff_55%,#dce7ff)] shadow-[0_30px_90px_rgba(89,102,255,0.14)]">
          <CardContent className="relative p-6 md:p-8">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[rgba(89,102,255,0.12)]" />
            <div className="absolute bottom-0 right-6 h-28 w-28 rounded-full bg-[rgba(244,114,182,0.08)] blur-2xl" />
            <div className="relative space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge>Primary savings</Badge>
                <Badge variant="muted">{member.account.accountNumber}</Badge>
              </div>

              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Total balance
                </p>
                <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-[var(--foreground)] md:text-4xl">
                  {formatCurrency(member.account.balance)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/80 bg-white/80 px-4 py-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    Net flow
                  </p>
                  <p className="mt-2 text-lg font-semibold tabular-nums text-[var(--foreground)]">
                    {formatCurrency(ledger.summary.netFlow)}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/80 bg-white/80 px-4 py-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    Last activity
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                    {ledger.summary.lastTransactionAt
                      ? formatDateTime(ledger.summary.lastTransactionAt)
                      : "No savings activity yet"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/80 bg-white/80 px-4 py-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    Account opened
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                    {formatDate(member.account.openedAt)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityDonut
              title="Savings mix"
              description="A quick look at how your ledger has moved between deposits and withdrawals."
              centerValue={`${ledger.summary.depositShare}%`}
              centerLabel="Deposit share"
              primaryLabel="Deposited"
              primaryValue={formatCurrency(ledger.summary.totalDeposited)}
              secondaryLabel="Withdrawn"
              secondaryValue={formatCurrency(ledger.summary.totalWithdrawn)}
              percent={ledger.summary.depositShare}
            />
          </CardContent>
        </Card>
      </div>

      <ResponsiveStatCards>
        <Card>
          <CardHeader>
            <CardTitle>Savings balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums md:text-4xl">
              {formatCurrency(member.account.balance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total deposited</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums md:text-4xl">
              {formatCurrency(ledger.summary.totalDeposited)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total withdrawn</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums md:text-4xl">
              {formatCurrency(ledger.summary.totalWithdrawn)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transactions logged</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums md:text-4xl">
              {ledger.summary.transactionCount}
            </p>
          </CardContent>
        </Card>
      </ResponsiveStatCards>

      <Card>
        <CardHeader>
          <CardTitle>Transaction log</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberTransactionLog
            memberId={member.id}
            transactions={ledger.transactions}
          />
        </CardContent>
      </Card>
    </section>
  );
}
