"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ResponsiveDataList } from "@/components/tables/responsive-data-list";
import {
  Field,
  loanRequest as request,
  Notice,
  selectClass,
} from "@/components/loans/shared";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import type { RunRecord } from "@/lib/investments/types";

export function DividendWorkspace({
  runs,
  role,
  previousYear,
}: {
  runs: RunRecord[];
  role: string;
  previousYear: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    financialYear: previousYear,
    periodStart: `${previousYear}-01-01`,
    periodEnd: `${previousYear}-12-31`,
    totalPoolAmount: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | "post" | null>(
    null,
  );
  const [comment, setComment] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [page, setPage] = useState(1);
  const [runsPage, setRunsPage] = useState(1);
  const run = runs.find((row) => row.id === selected);
  const visibleRuns = runs.filter((row) => !status || row.status === status);
  useEffect(() => {
    if (run)
      document
        .getElementById("dividend-allocation-review")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [run]);
  const shares = (run?.calculationSnapshot ?? []).filter((row) =>
    `${row.memberNumber} ${row.memberName}`
      .toLowerCase()
      .includes(memberQuery.toLowerCase()),
  );
  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await request<{ id: string }>("/api/dividend-runs", form);
      setMessage(
        "Dividend proposal created. Review the member allocations before Board approval.",
      );
      setSelected(result.id);
      setForm({ ...form, totalPoolAmount: "" });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not propose dividends.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submitAction(event: FormEvent) {
    event.preventDefault();
    if (!run || !action) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request(
        `/api/dividend-runs/${run.id}/${action}`,
        action === "post" ? { password, confirm } : { comment },
      );
      setMessage(
        action === "post"
          ? "Dividend run posted. Member savings and dividend histories have been updated."
          : action === "approve"
            ? "Dividend run approved. The Treasurer can now post it."
            : "Dividend proposal rejected. A revised proposal may be created for this year.",
      );
      setAction(null);
      setPassword("");
      setComment("");
      setConfirm(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not complete this action.",
      );
    } finally {
      setBusy(false);
    }
  }
  function openAction(next: "approve" | "reject" | "post") {
    setAction(next);
    setError("");
    setComment("");
    setPassword("");
    setConfirm(false);
  }
  return (
    <div className="w-full min-w-0 space-y-6">
      {error && !action && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <div className="grid min-w-0 gap-6 xl:grid-cols-[2fr_1fr]">
        {role === "TREASURER" && (
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Propose financial-year dividends</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
                <Field label="Financial year (ending year)">
                  <Input
                    required
                    className="text-base"
                    type="number"
                    min="2000"
                    max={previousYear + 1}
                    value={form.financialYear}
                    onChange={(e) => {
                      const year = Number(e.target.value);
                      setForm({
                        ...form,
                        financialYear: year,
                        periodStart: `${year}-01-01`,
                        periodEnd: `${year}-12-31`,
                      });
                    }}
                  />
                </Field>
                <Field label="Dividend pool (UGX)">
                  <Input
                    required
                    className="text-base"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.totalPoolAmount}
                    onChange={(e) =>
                      setForm({ ...form, totalPoolAmount: e.target.value })
                    }
                  />
                </Field>
                <Field label="Financial year starts">
                  <Input
                    required
                    className="text-base"
                    type="date"
                    value={form.periodStart}
                    onChange={(e) =>
                      setForm({ ...form, periodStart: e.target.value })
                    }
                  />
                </Field>
                <Field label="Financial year ends">
                  <Input
                    required
                    className="text-base"
                    type="date"
                    value={form.periodEnd}
                    onChange={(e) =>
                      setForm({ ...form, periodEnd: e.target.value })
                    }
                  />
                </Field>
                <p className="text-base leading-7 text-[var(--muted-foreground)] sm:col-span-2">
                  Use a completed 12-month financial year. The ending year
                  identifies the run. Creating a proposal calculates each
                  member’s share for Board review.
                </p>
                <p className="text-base leading-7 text-[var(--muted-foreground)] sm:col-span-2">
                  Fund the pool from non-interest surplus (fees, investment
                  returns). Loan interest is already shared with members
                  monthly under Member Earnings.
                </p>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={busy}>
                    {busy ? "Calculating…" : "Calculate and propose"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
        <Card className={role !== "TREASURER" ? "xl:col-span-2" : ""}>
          <CardHeader>
            <CardTitle>Calculation method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-base leading-7 text-[var(--muted-foreground)]">
            <p className="font-semibold text-[var(--foreground)]">
              Pro-rata by average savings balance over the financial year
            </p>
            <p>
              Daily closing balances use Kampala time. Days before a member’s
              first savings are included at zero. Each share is the member’s
              average divided by all eligible averages, multiplied by the pool.
            </p>
            <p>
              Active members with active savings accounts and a positive average
              are eligible when the proposal is created. The proposed amounts
              remain fixed through approval and posting. Rounding cents are
              distributed so the full pool is allocated.
            </p>
            <p className="text-sm">
              Pilot calculation setting: average daily savings. This is the only
              available method.
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Dividend runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Filter runs by status">
            <select
              className={selectClass}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setRunsPage(1);
              }}
            >
              <option value="">All runs</option>
              {["PROPOSED", "APPROVED", "REJECTED", "POSTED"].map((value) => (
                <option key={value} value={value}>
                  {titleCase(value)}
                </option>
              ))}
            </select>
          </Field>
          <ResponsiveDataList
            rows={visibleRuns.slice((runsPage - 1) * 6, runsPage * 6)}
            getRowId={(row) => row.id}
            emptyMessage="No dividend runs found."
            columns={[
              {
                label: "Year",
                className: "text-base font-semibold",
                render: (row) => row.financialYear,
              },
              {
                label: "Period",
                className: "text-base md:whitespace-nowrap",
                render: (row) => (
                  <>
                    {formatDate(row.periodStart)}
                    <p>to {formatDate(row.periodEnd)}</p>
                  </>
                ),
              },
              {
                label: "Pool",
                className: "text-base tabular-nums md:whitespace-nowrap",
                render: (row) => formatCurrency(row.totalPoolAmount),
              },
              {
                label: "Members",
                className: "text-base",
                render: (row) => row.calculationSnapshot.length,
              },
              {
                label: "Status",
                render: (row) => (
                  <Badge
                    variant={
                      row.status === "POSTED"
                        ? "success"
                        : row.status === "REJECTED"
                          ? "muted"
                          : "warning"
                    }
                  >
                    {titleCase(row.status)}
                  </Badge>
                ),
              },
              {
                label: "Action",
                render: (row) => (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setSelected(row.id);
                      setMemberQuery("");
                      setPage(1);
                    }}
                  >
                    Review {row.financialYear}
                  </Button>
                ),
              },
            ]}
          />
          {visibleRuns.length > 6 && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-base">
              <span>
                {visibleRuns.length} runs · Page {runsPage} of{" "}
                {Math.ceil(visibleRuns.length / 6)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={runsPage === 1}
                  onClick={() => setRunsPage(runsPage - 1)}
                >
                  Previous runs
                </Button>
                <Button
                  variant="outline"
                  disabled={runsPage * 6 >= visibleRuns.length}
                  onClick={() => setRunsPage(runsPage + 1)}
                >
                  Next runs
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {run && (
        <Card id="dividend-allocation-review" className="min-w-0 scroll-mt-24">
          <CardHeader>
            <CardTitle>
              Financial year {run.financialYear} allocation review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge>{titleCase(run.status)}</Badge>
              <p className="text-2xl font-bold tabular-nums">
                {formatCurrency(run.totalPoolAmount)}
              </p>
              <span className="text-base">
                across {run.calculationSnapshot.length} members
              </span>
            </div>
            <div className="space-y-1 text-base text-[var(--muted-foreground)]">
              <p>
                Proposed by {run.runBy.username ?? "Treasurer"} on{" "}
                {formatDate(run.runDate)}.
              </p>
              {run.decidedAt && (
                <p>
                  {run.status === "REJECTED" ? "Rejected" : "Approved"} by{" "}
                  {run.decidedBy?.username ?? "Board"} on{" "}
                  {formatDate(run.decidedAt)}: {run.decisionComment}
                </p>
              )}
              {run.postedAt && (
                <p>Credited to savings on {formatDate(run.postedAt)}.</p>
              )}
            </div>
            <Field label="Find a dividend recipient">
              <Input
                className="text-base"
                value={memberQuery}
                onChange={(e) => {
                  setMemberQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Member name or number"
              />
            </Field>
            <ResponsiveDataList
              rows={shares.slice((page - 1) * 12, page * 12)}
              getRowId={(row) => row.memberId}
              emptyMessage="No matching recipients."
              columns={[
                {
                  label: "Member",
                  className: "text-base",
                  render: (row) => (
                    <>
                      {row.memberName}
                      <p className="text-sm">{row.memberNumber}</p>
                    </>
                  ),
                },
                {
                  label: "Average savings",
                  className: "text-base tabular-nums",
                  render: (row) => formatCurrency(row.averageBalance),
                },
                {
                  label: "Dividend",
                  className: "text-base font-semibold tabular-nums",
                  render: (row) => formatCurrency(row.amount),
                },
              ]}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 text-base">
              <span>
                {shares.length} recipients · Page {page} of{" "}
                {Math.max(1, Math.ceil(shares.length / 12))}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page * 12 >= shares.length}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
            {role === "BOARD" && run.status === "PROPOSED" && (
              <div className="flex flex-wrap gap-3">
                <Button disabled={busy} onClick={() => openAction("approve")}>
                  Approve dividend run
                </Button>
                <Button
                  disabled={busy}
                  variant="danger"
                  onClick={() => openAction("reject")}
                >
                  Reject proposal
                </Button>
              </div>
            )}
            {role === "TREASURER" && run.status === "APPROVED" && (
              <Button disabled={busy} onClick={() => openAction("post")}>
                Post dividends to savings
              </Button>
            )}
            {run.status === "PROPOSED" && role !== "BOARD" && (
              <p className="text-base text-[var(--muted-foreground)]">
                Awaiting Board review before posting.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      <ResponsiveDialog
        open={!!action && !!run}
        title={
          action === "post"
            ? "Confirm dividend posting"
            : action === "reject"
              ? "Reject dividend proposal"
              : "Approve dividend proposal"
        }
        onClose={() => {
          if (!busy) {
            setAction(null);
            setPassword("");
          }
        }}
      >
        {run && (
          <form onSubmit={submitAction} className="space-y-4">
            {error && <Notice error>{error}</Notice>}
            <p className="text-base">
              Financial year {run.financialYear}:{" "}
              <strong className="tabular-nums">
                {formatCurrency(run.totalPoolAmount)}
              </strong>{" "}
              for {run.calculationSnapshot.length} members.
            </p>
            {action === "post" ? (
              <>
                <p className="text-base">
                  Posting credits the approved amounts to member savings and
                  records their dividend history.
                </p>
                <Field label="Confirm your password">
                  <Input
                    required
                    autoComplete="current-password"
                    className="text-base"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
                <label className="flex min-h-11 items-start gap-3 text-base">
                  <input
                    required
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0"
                    checked={confirm}
                    onChange={(e) => setConfirm(e.target.checked)}
                  />
                  I have reviewed the approved allocation and confirm posting
                  this dividend pool.
                </label>
              </>
            ) : (
              <Field
                label={
                  action === "reject"
                    ? "Reason for rejection"
                    : "Board review comment"
                }
              >
                <textarea
                  required
                  minLength={3}
                  maxLength={2000}
                  className={`${selectClass} min-h-24 py-3`}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </Field>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={busy}
                variant={action === "reject" ? "danger" : "default"}
              >
                {busy
                  ? "Saving…"
                  : action === "post"
                    ? "Confirm posting"
                    : action === "reject"
                      ? "Confirm rejection"
                      : "Confirm approval"}
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() => {
                  setAction(null);
                  setPassword("");
                }}
              >
                Go back
              </Button>
            </div>
          </form>
        )}
      </ResponsiveDialog>
    </div>
  );
}
