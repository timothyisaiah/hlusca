"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { BellRing, Search, WalletCards } from "lucide-react";

import { SavingsTransactionForm } from "@/components/forms/savings-transaction-form";
import { ResponsiveStatCards } from "@/components/layout/responsive-stat-cards";
import { ActivityDonut } from "@/components/savings/activity-donut";
import { MemberTransactionLog } from "@/components/savings/member-transaction-log";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { TreasurerSavingsWorkspace as TreasurerSavingsWorkspaceData } from "@/lib/savings/types";
import { cn, formatCurrency, formatDate, formatDateTime, titleCase } from "@/lib/utils";

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
  const [dialogMode, setDialogMode] = useState<"deposit" | "withdraw" | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const selectedMember = workspace.selectedMember;
  const selectedLedger = workspace.selectedLedger;

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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Treasurer
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl">
            Savings operations desk
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">
            Search a member, record deposits or withdrawals, and keep the ledger fully
            auditable from one responsive workspace.
          </p>
        </div>

        <div className="hidden gap-3 md:flex">
          <Button
            className="min-w-[11rem]"
            disabled={!selectedMember}
            onClick={() => setDialogMode("deposit")}
          >
            Record deposit
          </Button>
          <Button
            variant="outline"
            className="min-w-[11rem]"
            disabled={!selectedMember}
            onClick={() => setDialogMode("withdraw")}
          >
            Record withdrawal
          </Button>
        </div>
      </div>

      {flashMessage ? (
        <div className="rounded-[28px] border border-[rgba(89,102,255,0.16)] bg-[linear-gradient(135deg,rgba(89,102,255,0.12),rgba(244,114,182,0.08))] px-5 py-4">
          <p className="text-sm font-medium text-[var(--foreground)]">{flashMessage}</p>
        </div>
      ) : null}

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
                    href={`/dashboard/treasurer?member=${member.id}`}
                    scroll={false}
                    className={cn(
                      "block rounded-[28px] border px-4 py-4 transition hover:border-[rgba(89,102,255,0.18)] hover:bg-[var(--surface-muted)]",
                      selectedMember?.id === member.id
                        ? "border-[rgba(89,102,255,0.18)] bg-[linear-gradient(135deg,rgba(89,102,255,0.08),rgba(244,114,182,0.04))]"
                        : "border-[var(--surface-border)] bg-white",
                    )}
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

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedMember
                  ? `${selectedMember.firstName} ${selectedMember.lastName}`
                  : "Selected ledger"}
              </CardTitle>
              <CardDescription>
                {selectedMember
                  ? `${selectedMember.memberNumber} / ${selectedMember.account.accountNumber}`
                  : "Choose a member to inspect their current savings position."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedMember && selectedLedger ? (
                <>
                  <div className="rounded-[28px] bg-[linear-gradient(135deg,rgba(89,102,255,0.12),rgba(244,114,182,0.08))] px-5 py-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                          Available savings
                        </p>
                        <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--foreground)] md:text-4xl">
                          {formatCurrency(selectedMember.account.balance)}
                        </p>
                      </div>
                      <Badge variant={statusVariant(selectedMember.status)}>
                        {selectedMember.status}
                      </Badge>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-3xl bg-white px-4 py-4">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                          Transactions
                        </p>
                        <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                          {selectedLedger.summary.transactionCount}
                        </p>
                      </div>
                      <div className="rounded-3xl bg-white px-4 py-4">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                          Last activity
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                          {selectedLedger.summary.lastTransactionAt
                            ? formatDateTime(selectedLedger.summary.lastTransactionAt)
                            : "No savings activity yet"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <ActivityDonut
                    title="Savings activity mix"
                    description="Deposits vs withdrawals across the member's lifetime ledger."
                    centerValue={`${selectedLedger.summary.depositShare}%`}
                    centerLabel="Deposit share"
                    primaryLabel="Deposited"
                    primaryValue={formatCurrency(selectedLedger.summary.totalDeposited)}
                    secondaryLabel="Withdrawn"
                    secondaryValue={formatCurrency(selectedLedger.summary.totalWithdrawn)}
                    percent={selectedLedger.summary.depositShare}
                  />
                </>
              ) : (
                <div className="rounded-3xl bg-[var(--surface-muted)] px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">
                  The treasurer desk will populate once a member profile is available.
                </div>
              )}
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selected member transaction log</CardTitle>
          <CardDescription>
            Search, filter by type or date, paginate results, and export the same
            filtered ledger to CSV or PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedMember && selectedLedger ? (
            <MemberTransactionLog
              key={selectedMember.id}
              memberId={selectedMember.id}
              transactions={selectedLedger.transactions}
              pageSize={5}
              emptyMessage="No savings transactions are recorded for this member yet."
            />
          ) : (
            <p className="rounded-3xl bg-[var(--surface-muted)] px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">
              Select a member to open their transaction log.
            </p>
          )}
        </CardContent>
      </Card>

      {selectedMember ? (
        <div className="fixed inset-x-0 bottom-4 z-40 px-4 md:hidden">
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-full border border-white/60 bg-white/95 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur">
            <Button className="flex-1" onClick={() => setDialogMode("deposit")}>
              Deposit
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDialogMode("withdraw")}
            >
              Withdraw
            </Button>
          </div>
        </div>
      ) : null}

      {selectedMember ? (
        <ResponsiveDialog
          open={dialogMode !== null}
          title={dialogMode === "deposit" ? "Record deposit" : "Record withdrawal"}
          onClose={() => setDialogMode(null)}
        >
          <SavingsTransactionForm
            mode={dialogMode ?? "deposit"}
            accountId={selectedMember.account.id}
            memberName={`${selectedMember.firstName} ${selectedMember.lastName}`}
            memberNumber={selectedMember.memberNumber}
            currentBalance={selectedMember.account.balance}
            onClose={() => setDialogMode(null)}
            onSuccess={setFlashMessage}
          />
        </ResponsiveDialog>
      ) : null}
    </section>
  );
}
