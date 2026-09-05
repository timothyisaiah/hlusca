"use client";

import Link from "next/link";
import type { Route } from "next";
import { useDeferredValue, useMemo, useState } from "react";
import { BellRing, Search, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TreasurerSavingsWorkspace as TreasurerSavingsWorkspaceData } from "@/lib/savings/types";
import { formatCurrency, formatDate, formatDateTime, titleCase } from "@/lib/utils";

type TreasurerSavingsWorkspaceProps = {
  workspace: TreasurerSavingsWorkspaceData;
};

function statusVariant(status: string) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "PENDING":
      return "warning" as const;
    default:
      return "muted" as const;
  }
}

export function TreasurerSavingsWorkspace({
  workspace,
}: TreasurerSavingsWorkspaceProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredMembers = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();

    if (!normalized) {
      return workspace.members;
    }

    return workspace.members.filter((member) =>
      [
        member.memberNumber,
        member.firstName,
        member.lastName,
        member.username ?? "",
        member.account.accountNumber,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [deferredQuery, workspace.members]);

  return (
    <section className="space-y-6 md:space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Treasurer
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl">
          Savings operations desk
        </h1>
        <p className="max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">
          Search a member to open their savings ledger, review activity, and post an
          auditable transaction from a dedicated workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#5d6bff,#8fb9ff)] text-white shadow-[0_30px_90px_rgba(93,107,255,0.28)]">
          <CardContent className="relative p-6 md:p-8">
            <div className="absolute right-[-2rem] top-[-2rem] h-32 w-32 rounded-full bg-white/12 blur-sm" />
            <div className="absolute bottom-[-3rem] right-10 h-40 w-40 rounded-full bg-white/8" />
            <div className="relative space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-white/16 text-white">Phase 2 live</Badge>
                <Badge className="bg-white/12 text-white">
                  {workspace.summary.monthlyTransactionCount} transactions this month
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/80">
                  Total savings under management
                </p>
                <p className="text-3xl font-bold tracking-tight tabular-nums md:text-4xl">
                  {formatCurrency(workspace.summary.totalSavings)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] bg-white/14 px-4 py-4 backdrop-blur">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/75">
                    Deposits this month
                  </p>
                  <p className="mt-3 text-xl font-semibold tabular-nums">
                    {formatCurrency(workspace.summary.monthlyDeposits)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-white/14 px-4 py-4 backdrop-blur">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/75">
                    Withdrawals this month
                  </p>
                  <p className="mt-3 text-xl font-semibold tabular-nums">
                    {formatCurrency(workspace.summary.monthlyWithdrawals)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-white/14 px-4 py-4 backdrop-blur">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/75">
                    Net movement
                  </p>
                  <p className="mt-3 text-xl font-semibold tabular-nums">
                    {formatCurrency(workspace.summary.monthlyNetFlow)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Real-time guidance</CardTitle>
            <CardDescription>
              The first successful deposit automatically activates a pending member and
              every failed attempt is written to the audit log too.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-[var(--accent-soft)] p-2 text-[var(--accent-ink)]">
                  <WalletCards className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Active savings accounts
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Accounts ready for same-session posting.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tabular-nums text-[var(--foreground)] md:text-4xl">
                {workspace.summary.activeAccounts}
              </p>
            </div>

            <div className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-[#efeafe] p-2 text-[#6e62dd]">
                  <BellRing className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Pending activations
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Members waiting on their first savings movement.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tabular-nums text-[var(--foreground)] md:text-4xl">
                {workspace.summary.pendingActivations}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Member ledger search</CardTitle>
            <CardDescription>
              Find a member by number, name, username, or account to open their live
              savings ledger.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                className="pl-11"
                placeholder="Search member ledgers"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="space-y-3">
              {filteredMembers.length === 0 ? (
                <div className="rounded-3xl bg-[var(--surface-muted)] px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">
                  No member ledger matched that search.
                </div>
              ) : (
                filteredMembers.map((member) => (
                  <Link
                    key={member.id}
                    href={`/dashboard/treasurer/members/${member.id}` as Route}
                    className="block rounded-[28px] border border-[var(--surface-border)] bg-white px-4 py-4 transition hover:border-[rgba(89,102,255,0.18)] hover:bg-[var(--surface-muted)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold text-[var(--foreground)]">
                            {member.firstName} {member.lastName}
                          </p>
                          <Badge variant={statusVariant(member.status)}>{member.status}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                          {member.memberNumber}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                          {member.username ?? "No username"} / {member.account.accountNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
                          {formatCurrency(member.account.balance)}
                        </p>
                        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                          {member.lastTransactionAt
                            ? `Last ${titleCase(member.lastTransactionType ?? "DEPOSIT")} / ${formatDate(member.lastTransactionAt)}`
                            : "No activity yet"}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest cooperative activity</CardTitle>
            <CardDescription>
              A quick pulse of the most recent savings movements across HLUSCA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workspace.recentTransactions.length === 0 ? (
              <p className="rounded-3xl bg-[var(--surface-muted)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                Savings activity will appear here after the first posted transaction.
              </p>
            ) : (
              workspace.recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">
                        {transaction.member?.name ?? "Member"} / {titleCase(transaction.type)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {transaction.member?.memberNumber ?? "Member record"} /{" "}
                        {transaction.performedBy?.label ?? "System"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                    {formatDateTime(transaction.createdAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
