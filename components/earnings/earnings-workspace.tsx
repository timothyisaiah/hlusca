"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  Field,
  loanRequest as request,
  Notice,
} from "@/components/loans/shared";
import { ResponsiveDataList } from "@/components/tables/responsive-data-list";
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
import { Money } from "@/components/ui/money";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { EarningsRunRecord } from "@/lib/earnings/types";
import { formatCurrency, formatDate, formatMonth, titleCase } from "@/lib/utils";

const PAGE_SIZE = 12;

function statusVariant(status: EarningsRunRecord["status"]) {
  return status === "POSTED" ? ("success" as const) : status === "PROPOSED" ? ("warning" as const) : ("muted" as const);
}

export function EarningsWorkspace({
  runs,
  role,
  previousMonth,
  sharePercent,
}: {
  runs: EarningsRunRecord[];
  role: string;
  previousMonth: string;
  sharePercent: string;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(previousMonth);
  const [share, setShare] = useState(sharePercent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string | null>(
    runs.find((run) => run.status === "PROPOSED")?.id ?? null,
  );
  const [action, setAction] = useState<"post" | "cancel" | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const run = runs.find((row) => row.id === selected);
  const shares = (run?.calculationSnapshot.shares ?? []).filter((row) =>
    `${row.memberNumber} ${row.memberName}`.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (run)
      document
        .getElementById("earnings-review")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [run]);

  async function perform(work: () => Promise<string>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setMessage(await work());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete this action.");
    } finally {
      setBusy(false);
    }
  }

  function propose(event: FormEvent) {
    event.preventDefault();
    void perform(async () => {
      const result = await request<{ id: string }>("/api/earnings-runs", { month });
      setSelected(result.id);
      setQuery("");
      setPage(1);
      return `Earnings for ${formatMonth(month)} calculated. Review the member shares, then post them.`;
    });
  }

  function saveShare(event: FormEvent) {
    event.preventDefault();
    void perform(async () => {
      await request("/api/earnings-settings", { memberSharePercent: share }, "PATCH");
      return `Members will receive ${share}% of collected loan interest in future runs.`;
    });
  }

  function submitAction(event: FormEvent) {
    event.preventDefault();
    if (!run || !action) return;
    void perform(async () => {
      await request(
        `/api/earnings-runs/${run.id}/${action}`,
        action === "post" ? { password, confirm } : {},
      );
      setAction(null);
      setPassword("");
      setConfirm(false);
      return action === "post"
        ? `${formatMonth(run.month)} earnings posted. Member savings have been credited.`
        : `${formatMonth(run.month)} proposal cancelled. You can calculate it again.`;
    });
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      {error && !action ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}

      <div className="grid min-w-0 gap-6 @5xl/main:grid-cols-[2fr_1fr]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>How member earnings work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-base leading-7 text-[var(--muted-foreground)]">
            <p>
              Each month, interest <strong className="text-[var(--foreground)]">collected</strong>{" "}
              from borrowers is shared with savers. Members receive{" "}
              <strong className="text-[var(--foreground)]">{sharePercent}%</strong>; the rest is
              retained by the SACCO.
            </p>
            <p>
              Interest is credited to the days it was earned (from the previous due date to the
              installment&apos;s due date). Each day&apos;s interest is shared by every member&apos;s{" "}
              <strong className="text-[var(--foreground)]">lowest balance during that day</strong>, so
              a deposit earns from the next day and a withdrawal stops earning on the same day.
            </p>
            <p>
              Posting credits the shares to savings, where they earn in later months. Prepaid
              interest waits until its days pass; unpaid interest is never shared. Shares for
              accounts that are no longer active are retained.
            </p>
          </CardContent>
        </Card>

        <div className="grid min-w-0 content-start gap-6">
          {role === "TREASURER" ? (
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Calculate a month</CardTitle>
                <CardDescription>
                  Shares interest collected through the end of the month that has not been shared
                  yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={propose} className="space-y-4">
                  <Field label="Month">
                    <Input
                      required
                      type="month"
                      className="text-base"
                      max={previousMonth}
                      value={month}
                      onChange={(event) => setMonth(event.target.value)}
                    />
                  </Field>
                  <Button type="submit" disabled={busy} className="w-full">
                    {busy ? "Calculating…" : "Calculate earnings"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {role === "ADMIN" ? (
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Member share</CardTitle>
                <CardDescription>
                  Percentage of collected loan interest credited to members. Applies to runs
                  calculated after saving.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveShare} className="space-y-4">
                  <Field label="Member share (%)">
                    <Input
                      required
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="0.01"
                      className="text-base"
                      value={share}
                      onChange={(event) => setShare(event.target.value)}
                    />
                  </Field>
                  <Button type="submit" disabled={busy} className="w-full">
                    {busy ? "Saving…" : "Save share"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Earnings runs</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveDataList
            rows={runs}
            getRowId={(row) => row.id}
            emptyMessage="No earnings runs yet."
            columns={[
              {
                label: "Month",
                className: "text-base font-semibold",
                render: (row) => formatMonth(row.month),
              },
              {
                label: "Interest collected",
                className: "text-base tabular-nums md:whitespace-nowrap",
                render: (row) => formatCurrency(row.interestCollected),
              },
              {
                label: "To members",
                className: "text-base tabular-nums md:whitespace-nowrap",
                render: (row) => formatCurrency(row.memberPool),
              },
              {
                label: "Members",
                className: "text-base tabular-nums",
                render: (row) => row.calculationSnapshot.shares.length,
              },
              {
                label: "Status",
                render: (row) => <Badge variant={statusVariant(row.status)}>{titleCase(row.status)}</Badge>,
              },
              {
                label: "Action",
                render: (row) => (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setSelected(row.id);
                      setQuery("");
                      setPage(1);
                    }}
                  >
                    Review
                  </Button>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      {run ? (
        <Card id="earnings-review" className="min-w-0 scroll-mt-24">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle>{formatMonth(run.month)} earnings</CardTitle>
              <Badge variant={statusVariant(run.status)}>{titleCase(run.status)}</Badge>
            </div>
            <CardDescription>
              Calculated by {run.proposedBy.username ?? "Treasurer"} on {formatDate(run.proposedAt)}
              {run.calculationSnapshot.firstDay && run.calculationSnapshot.lastDay
                ? ` · interest earned ${formatDate(run.calculationSnapshot.firstDay)} – ${formatDate(run.calculationSnapshot.lastDay)}`
                : ""}
              {run.postedAt
                ? ` · credited by ${run.postedBy?.username ?? "Treasurer"} on ${formatDate(run.postedAt)}`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 @xl/main:grid-cols-3">
              {[
                ["Interest collected", run.interestCollected, `${run.calculationSnapshot.loans.length} loans`],
                ["To members", run.memberPool, `${run.memberSharePercent}% share`],
                [
                  "Retained",
                  run.reserveAmount,
                  Number(run.forfeitedAmount) > 0
                    ? `+ ${formatCurrency(run.forfeitedAmount)} from inactive accounts`
                    : "SACCO share",
                ],
              ].map(([label, value, hint]) => (
                <div
                  key={label}
                  className="min-w-0 rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-4"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    {label}
                  </p>
                  <Money value={value} size="md" className="mt-2" />
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{hint}</p>
                </div>
              ))}
            </div>

            <Field label="Find a member">
              <Input
                className="text-base"
                placeholder="Member name or number"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </Field>
            <ResponsiveDataList
              rows={shares.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
              getRowId={(row) => row.memberId}
              emptyMessage="No matching members."
              columns={[
                {
                  label: "Member",
                  className: "text-base",
                  render: (row) => (
                    <>
                      {row.memberName}
                      <p className="text-sm text-[var(--muted-foreground)]">{row.memberNumber}</p>
                    </>
                  ),
                },
                {
                  label: "Earning days",
                  className: "text-base tabular-nums",
                  render: (row) => row.earningDays,
                },
                {
                  label: "Earnings",
                  className: "text-base font-semibold tabular-nums md:whitespace-nowrap",
                  render: (row) => formatCurrency(row.amount),
                },
                {
                  label: "Account",
                  render: (row) =>
                    row.accountActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="muted">Inactive · retained</Badge>
                    ),
                },
              ]}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 text-base">
              <span>
                {shares.length} members · Page {page} of {Math.max(1, Math.ceil(shares.length / PAGE_SIZE))}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page * PAGE_SIZE >= shares.length}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>

            {role === "TREASURER" && run.status === "PROPOSED" ? (
              <div className="flex flex-wrap gap-3">
                <Button disabled={busy} onClick={() => { setError(""); setAction("post"); }}>
                  Post earnings to savings
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => { setError(""); setAction("cancel"); }}>
                  Cancel proposal
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <ResponsiveDialog
        open={!!action && !!run}
        title={action === "post" ? "Confirm earnings posting" : "Cancel earnings proposal"}
        onClose={() => {
          if (!busy) {
            setAction(null);
            setPassword("");
          }
        }}
      >
        {run ? (
          <form onSubmit={submitAction} className="space-y-4">
            {error ? <Notice error>{error}</Notice> : null}
            <p className="text-base">
              {formatMonth(run.month)}:{" "}
              <strong className="tabular-nums">{formatCurrency(run.memberPool)}</strong> for{" "}
              {run.calculationSnapshot.shares.length} members.
            </p>
            {action === "post" ? (
              <>
                <Field label="Confirm your password">
                  <Input
                    required
                    type="password"
                    autoComplete="current-password"
                    className="text-base"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Field>
                <label className="flex min-h-11 items-start gap-3 text-base">
                  <input
                    required
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0"
                    checked={confirm}
                    onChange={(event) => setConfirm(event.target.checked)}
                  />
                  I have reviewed the member shares and confirm crediting them to savings.
                </label>
              </>
            ) : (
              <p className="text-base text-[var(--muted-foreground)]">
                Nothing is credited. The month can be calculated again afterwards.
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setAction(null);
                  setPassword("");
                }}
              >
                Go back
              </Button>
              <Button type="submit" disabled={busy} variant={action === "cancel" ? "danger" : "default"}>
                {busy ? "Saving…" : action === "post" ? "Confirm posting" : "Cancel proposal"}
              </Button>
            </div>
          </form>
        ) : null}
      </ResponsiveDialog>
    </div>
  );
}
