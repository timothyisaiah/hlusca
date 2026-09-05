"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { SavingsTransactionForm } from "@/components/forms/savings-transaction-form";
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
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { SavingsLedgerPage } from "@/lib/savings/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type TreasurerMemberLedgerProps = {
  ledger: SavingsLedgerPage;
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

export function TreasurerMemberLedger({ ledger }: TreasurerMemberLedgerProps) {
  const [dialogMode, setDialogMode] = useState<"deposit" | "withdraw" | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const { member, summary } = ledger;
  const memberName = `${member.firstName} ${member.lastName}`;

  return (
    <section className="space-y-6 pb-24 md:space-y-8 md:pb-0">
      <div className="space-y-4">
        <Link
          href="/dashboard/treasurer"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-soft)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to operations desk
        </Link>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Member savings ledger
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl">
              {memberName}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={statusVariant(member.status)}>{member.status}</Badge>
              <Badge variant="muted">{member.memberNumber}</Badge>
              <span className="text-sm text-[var(--muted-foreground)]">
                {member.account.accountNumber}
              </span>
            </div>
          </div>

          <div className="hidden gap-3 md:flex">
            <Button className="min-w-[11rem]" onClick={() => setDialogMode("deposit")}>
              Record deposit
            </Button>
            <Button
              variant="outline"
              className="min-w-[11rem]"
              onClick={() => setDialogMode("withdraw")}
            >
              Record withdrawal
            </Button>
          </div>
        </div>
      </div>

      {flashMessage ? (
        <div className="rounded-[28px] border border-[rgba(89,102,255,0.16)] bg-[linear-gradient(135deg,rgba(89,102,255,0.12),rgba(244,114,182,0.08))] px-5 py-4">
          <p className="text-sm font-medium text-[var(--foreground)]">{flashMessage}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#ffffff,#f1efff_55%,#dce7ff)] shadow-[0_30px_90px_rgba(89,102,255,0.14)]">
          <CardContent className="space-y-6 p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  Available savings
                </p>
                <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-[var(--foreground)] md:text-4xl">
                  {formatCurrency(member.account.balance)}
                </p>
              </div>
              <Badge variant={statusVariant(member.status)}>{member.status}</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/80 bg-white/80 px-4 py-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  Transactions logged
                </p>
                <p className="mt-3 text-3xl font-bold tabular-nums text-[var(--foreground)] md:text-4xl">
                  {summary.transactionCount}
                </p>
              </div>
              <div className="rounded-3xl border border-white/80 bg-white/80 px-4 py-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  Last activity
                </p>
                <p className="mt-3 text-sm font-semibold text-[var(--foreground)] md:text-base">
                  {summary.lastTransactionAt
                    ? formatDateTime(summary.lastTransactionAt)
                    : "No savings activity yet"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity mix</CardTitle>
            <CardDescription>Lifetime deposits and withdrawals.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityDonut
              title="Savings activity mix"
              description="Deposits vs withdrawals across this member&apos;s lifetime ledger."
              centerValue={`${summary.depositShare}%`}
              centerLabel="Deposit share"
              primaryLabel="Deposited"
              primaryValue={formatCurrency(summary.totalDeposited)}
              secondaryLabel="Withdrawn"
              secondaryValue={formatCurrency(summary.totalWithdrawn)}
              percent={summary.depositShare}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Member transaction log</CardTitle>
          <CardDescription>
            Search, filter, paginate, and export this member&apos;s ledger.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberTransactionLog
            memberId={member.id}
            transactions={ledger.transactions}
            emptyMessage="No savings transactions are recorded for this member yet."
          />
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-4 z-40 px-4 md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3 rounded-full border border-white/60 bg-white/95 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur">
          <Button className="flex-1" onClick={() => setDialogMode("deposit")}>
            Deposit
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => setDialogMode("withdraw")}>
            Withdraw
          </Button>
        </div>
      </div>

      <ResponsiveDialog
        open={dialogMode !== null}
        title={dialogMode === "deposit" ? "Record deposit" : "Record withdrawal"}
        onClose={() => setDialogMode(null)}
      >
        <SavingsTransactionForm
          mode={dialogMode ?? "deposit"}
          accountId={member.account.id}
          memberName={memberName}
          memberNumber={member.memberNumber}
          currentBalance={member.account.balance}
          onClose={() => setDialogMode(null)}
          onSuccess={setFlashMessage}
        />
      </ResponsiveDialog>
    </section>
  );
}
