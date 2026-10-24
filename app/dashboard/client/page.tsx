import { notFound } from "next/navigation";
import { DividendHistory } from "@/components/investments/member-history";
import { EarningsHistory } from "@/components/earnings/earnings-history";
import { memberEarningsSummary } from "@/lib/earnings/service";
import { dividendHistory } from "@/lib/investments/service";
import { getLoanActor } from "@/lib/loans/service";

import { ActivityDonut } from "@/components/savings/activity-donut";
import { MemberTransactionLog } from "@/components/savings/member-transaction-log";
import { ClientWithdrawalRequests } from "@/components/savings/withdrawal-requests";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResponsiveStatCards, StatCard } from "@/components/layout/responsive-stat-cards";
import { Money } from "@/components/ui/money";
import { requireRole } from "@/lib/auth/server";
import { getClientSavingsDashboard } from "@/lib/savings/service";
import { getMemberWithdrawalOverview } from "@/lib/savings/withdrawals";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export default async function ClientDashboardPage() {
  const user = await requireRole(["CLIENT"]);

  if (!user.memberId) {
    notFound();
  }

  const actor = await getLoanActor(user.id);
  const [dashboard, dividends, withdrawals, earnings] = await Promise.all([
    getClientSavingsDashboard(user.memberId),
    dividendHistory(actor),
    getMemberWithdrawalOverview(user.memberId),
    memberEarningsSummary(actor),
  ]);
  const { member, ledger } = dashboard;
  const availableToWithdraw = Math.max(
    0,
    Number(member.account.balance) - Number(withdrawals.openTotal),
  );

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

      <div className="grid grid-cols-1 gap-6 @5xl/main:grid-cols-[2fr_1fr]">
        <Card className="flex flex-col overflow-hidden border-0 bg-[image:var(--hero-soft)] shadow-[0_30px_90px_var(--accent-shadow)]">
          {/* Fills the row height set by the snapshot card: balance on top,
              detail tiles anchored to the bottom instead of leaving a gap. */}
          <CardContent className="@container relative flex flex-1 flex-col justify-between gap-8 p-6 md:p-8">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--accent-soft)]" />
            <div className="absolute bottom-0 right-6 h-28 w-28 rounded-full bg-[var(--category-pink-soft)] blur-2xl" />
            <div className="relative space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge>Primary savings</Badge>
                <Badge variant="muted">{member.account.accountNumber}</Badge>
              </div>

              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Total balance
                </p>
                <Money
                  value={member.account.balance}
                  size="xl"
                  className="mt-3 text-[var(--foreground)]"
                />
              </div>
            </div>

            <div className="relative grid gap-4 @xl:grid-cols-3">
              <div className="min-w-0 rounded-[24px] border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] px-4 py-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  Net flow
                </p>
                <Money
                  value={ledger.summary.netFlow}
                  size="md"
                  className="mt-2 text-[var(--foreground)]"
                />
              </div>
              <div className="min-w-0 rounded-[24px] border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] px-4 py-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  Last activity
                </p>
                <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                  {ledger.summary.lastTransactionAt
                    ? formatDateTime(ledger.summary.lastTransactionAt)
                    : "No savings activity yet"}
                </p>
              </div>
              <div className="min-w-0 rounded-[24px] border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] px-4 py-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  Account opened
                </p>
                <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                  {formatDate(member.account.openedAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity snapshot</CardTitle>
            <CardDescription>
              How your savings have moved between deposits and withdrawals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityDonut
              centerValue={`${ledger.summary.depositShare}%`}
              centerLabel="Deposit share"
              primaryLabel="Deposited"
              primaryValue={ledger.summary.totalDeposited}
              secondaryLabel="Withdrawn"
              secondaryValue={ledger.summary.totalWithdrawn}
              percent={ledger.summary.depositShare}
            />
          </CardContent>
        </Card>
      </div>

      <ResponsiveStatCards>
        <StatCard
          label="Available to withdraw"
          value={<Money value={availableToWithdraw} />}
          hint={
            Number(withdrawals.openTotal) > 0
              ? `${formatCurrency(withdrawals.openTotal)} reserved by open requests`
              : "Your full savings balance"
          }
        />
        <StatCard
          label="Total deposited"
          value={<Money value={ledger.summary.totalDeposited} />}
        />
        <StatCard
          label="Total withdrawn"
          value={<Money value={ledger.summary.totalWithdrawn} />}
        />
        <StatCard
          label="Loan earnings this year"
          value={<Money value={earnings.yearToDate} />}
          hint={
            earnings.accruing && Number(earnings.accruing) > 0
              ? `≈ ${formatCurrency(earnings.accruing)} accruing, credited monthly`
              : "Your share of interest paid by borrowers"
          }
        />
      </ResponsiveStatCards>

      <ClientWithdrawalRequests
        requests={withdrawals.requests}
        balance={member.account.balance}
        openTotal={withdrawals.openTotal}
        canRequest={member.status === "ACTIVE" && member.account.status === "ACTIVE"}
      />

      <div className="grid min-w-0 grid-cols-1 gap-6 @5xl/main:grid-cols-2">
        <EarningsHistory rows={earnings.history} />
        <DividendHistory rows={dividends} />
      </div>

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
