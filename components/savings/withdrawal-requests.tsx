"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import {
  Field,
  loanRequest as request,
  Notice,
  selectClass,
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
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type {
  TreasurerWithdrawalQueue as TreasurerWithdrawalQueueData,
  WithdrawalRequestRecord,
} from "@/lib/savings/types";
import { formatCurrency, formatDate, formatDateTime, titleCase } from "@/lib/utils";

const PAYOUT_METHODS = ["MOBILE_MONEY", "BANK_TRANSFER", "CASH"] as const;

function statusVariant(status: WithdrawalRequestRecord["status"]) {
  switch (status) {
    case "DISBURSED":
      return "success" as const;
    case "PENDING":
    case "APPROVED":
      return "warning" as const;
    default:
      return "muted" as const;
  }
}

function statusLabel(status: WithdrawalRequestRecord["status"]) {
  switch (status) {
    case "PENDING":
      return "Awaiting review";
    case "APPROVED":
      return "Approved, awaiting payout";
    case "DISBURSED":
      return "Paid out";
    default:
      return titleCase(status);
  }
}

function payoutLabel(row: WithdrawalRequestRecord) {
  return row.payoutDetails
    ? `${titleCase(row.payoutMethod)} · ${row.payoutDetails}`
    : titleCase(row.payoutMethod);
}

function StatusCell({ row }: { row: WithdrawalRequestRecord }) {
  return (
    <div className="space-y-1">
      <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
      {row.status === "REJECTED" && row.reviewComment ? (
        <p className="text-sm text-[var(--muted-foreground)]">{row.reviewComment}</p>
      ) : null}
      {row.status === "DISBURSED" && row.transactionReference ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Ref {row.transactionReference}
        </p>
      ) : null}
    </div>
  );
}

const emptyForm = {
  amount: "",
  payoutMethod: "MOBILE_MONEY" as (typeof PAYOUT_METHODS)[number],
  payoutDetails: "",
  reason: "",
};

export function ClientWithdrawalRequests({
  requests,
  balance,
  openTotal,
  canRequest,
}: {
  requests: WithdrawalRequestRecord[];
  balance: string;
  openTotal: string;
  canRequest: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState<WithdrawalRequestRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const available = Math.max(0, Number(balance) - Number(openTotal));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request("/api/withdrawal-requests", form);
      setMessage(
        "Withdrawal request sent. The Treasurer will review it and you will be notified of the decision.",
      );
      setForm(emptyForm);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the request.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!cancelling) return;
    setBusy(true);
    setError("");
    try {
      await request(`/api/withdrawal-requests/${cancelling.id}/cancel`, {});
      setMessage("Withdrawal request cancelled.");
      setCancelling(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel the request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Withdrawal requests</CardTitle>
          <CardDescription>
            Ask the Treasurer to pay out part of your savings. Your balance only changes
            once the payout is made.
          </CardDescription>
        </div>
        <Button
          className="shrink-0"
          disabled={!canRequest || available <= 0}
          onClick={() => {
            setError("");
            setMessage("");
            setOpen(true);
          }}
        >
          <ArrowUpRight className="mr-2 h-4 w-4" />
          Request withdrawal
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? <Notice>{message}</Notice> : null}
        {error && !open && !cancelling ? <Notice error>{error}</Notice> : null}
        {!canRequest ? (
          <Notice>
            Withdrawal requests open once your membership and savings account are active.
          </Notice>
        ) : null}
        <ResponsiveDataList
          rows={requests}
          getRowId={(row) => row.id}
          emptyMessage="You have not requested a withdrawal yet."
          columns={[
            {
              label: "Requested",
              className: "text-base md:whitespace-nowrap",
              render: (row) => formatDate(row.requestedAt),
            },
            {
              label: "Amount",
              className: "text-base font-semibold tabular-nums md:whitespace-nowrap",
              render: (row) => formatCurrency(row.amount),
            },
            {
              label: "Payout",
              className: "text-base",
              render: payoutLabel,
            },
            {
              label: "Status",
              render: (row) => <StatusCell row={row} />,
            },
            {
              label: "Action",
              render: (row) =>
                row.status === "PENDING" || row.status === "APPROVED" ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setError("");
                      setCancelling(row);
                    }}
                  >
                    Cancel request
                  </Button>
                ) : (
                  <span className="text-sm text-[var(--muted-foreground)]">—</span>
                ),
            },
          ]}
        />
      </CardContent>

      <ResponsiveDialog
        open={open}
        title="Request a withdrawal"
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <form onSubmit={submit} className="space-y-4">
          {error ? <Notice error>{error}</Notice> : null}
          <div className="rounded-[24px] bg-[var(--surface-muted)] px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
              Available to withdraw
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {formatCurrency(available)}
            </p>
            {Number(openTotal) > 0 ? (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {formatCurrency(openTotal)} is reserved by your open requests.
              </p>
            ) : null}
          </div>
          <Field label="Amount (UGX)">
            <Input
              required
              className="text-base"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              max={available}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
          <Field label="How should it be paid?">
            <select
              className={selectClass}
              value={form.payoutMethod}
              onChange={(e) =>
                setForm({
                  ...form,
                  payoutMethod: e.target.value as (typeof PAYOUT_METHODS)[number],
                })
              }
            >
              {PAYOUT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {titleCase(method)}
                </option>
              ))}
            </select>
          </Field>
          {form.payoutMethod !== "CASH" ? (
            <Field
              label={
                form.payoutMethod === "MOBILE_MONEY"
                  ? "Mobile money number"
                  : "Bank name and account number"
              }
            >
              <Input
                required
                className="text-base"
                maxLength={120}
                value={form.payoutDetails}
                onChange={(e) => setForm({ ...form, payoutDetails: e.target.value })}
              />
            </Field>
          ) : null}
          <Field label="Reason (optional)">
            <textarea
              maxLength={240}
              className={`${selectClass} min-h-24 py-3`}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </Field>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              Go back
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send request"}
            </Button>
          </div>
        </form>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={!!cancelling}
        title="Cancel withdrawal request"
        onClose={() => {
          if (!busy) setCancelling(null);
        }}
      >
        {cancelling ? (
          <div className="space-y-4">
            {error ? <Notice error>{error}</Notice> : null}
            <p className="text-base">
              Cancel your request for{" "}
              <strong className="tabular-nums">{formatCurrency(cancelling.amount)}</strong>{" "}
              made on {formatDate(cancelling.requestedAt)}?
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={busy} onClick={() => setCancelling(null)}>
                Keep request
              </Button>
              <Button variant="danger" disabled={busy} onClick={cancel}>
                {busy ? "Cancelling…" : "Cancel request"}
              </Button>
            </div>
          </div>
        ) : null}
      </ResponsiveDialog>
    </Card>
  );
}

type TreasurerAction = "approve" | "reject" | "disburse";

export function TreasurerWithdrawalQueue({
  queue,
}: {
  queue: TreasurerWithdrawalQueueData;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<WithdrawalRequestRecord | null>(null);
  const [action, setAction] = useState<TreasurerAction | null>(null);
  const [comment, setComment] = useState("");
  const [reference, setReference] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function openAction(row: WithdrawalRequestRecord, next: TreasurerAction) {
    setSelected(row);
    setAction(next);
    setComment("");
    setReference("");
    setPassword("");
    setConfirm(false);
    setError("");
    setMessage("");
  }

  function closeAction() {
    if (busy) return;
    setAction(null);
    setSelected(null);
    setPassword("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || !action) return;
    setBusy(true);
    setError("");
    try {
      await request(
        `/api/withdrawal-requests/${selected.id}/${action}`,
        action === "disburse" ? { password, reference, confirm } : { comment },
      );
      setMessage(
        action === "disburse"
          ? `Payout of ${formatCurrency(selected.amount)} to ${selected.member.name} recorded and their savings debited.`
          : action === "approve"
            ? `Request approved. Pay it out when funds have been released to ${selected.member.name}.`
            : `Request from ${selected.member.name} rejected. The member has been notified.`,
      );
      setAction(null);
      setSelected(null);
      setPassword("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete this action.");
    } finally {
      setBusy(false);
    }
  }

  const pendingCount = queue.open.filter((row) => row.status === "PENDING").length;
  const approvedCount = queue.open.length - pendingCount;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>Member withdrawal requests</CardTitle>
          <Badge variant={pendingCount ? "warning" : "muted"}>
            {pendingCount} to review
          </Badge>
          <Badge variant={approvedCount ? "warning" : "muted"}>
            {approvedCount} awaiting payout
          </Badge>
        </div>
        <CardDescription>
          Review requests members submitted from their portal, then pay out approved
          requests. Payout debits the member&apos;s savings and needs your password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? <Notice>{message}</Notice> : null}
        <ResponsiveDataList
          rows={queue.open}
          getRowId={(row) => row.id}
          emptyMessage="No withdrawal requests are waiting."
          columns={[
            {
              label: "Member",
              className: "text-base",
              render: (row) => (
                <>
                  {row.member.name}
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {row.member.memberNumber}
                  </p>
                </>
              ),
            },
            {
              label: "Amount",
              className: "text-base font-semibold tabular-nums md:whitespace-nowrap",
              render: (row) => formatCurrency(row.amount),
            },
            {
              label: "Balance",
              className: "text-base tabular-nums md:whitespace-nowrap",
              render: (row) => formatCurrency(row.member.balance),
            },
            {
              label: "Payout",
              className: "text-base",
              render: (row) => (
                <>
                  {payoutLabel(row)}
                  {row.reason ? (
                    <p className="text-sm text-[var(--muted-foreground)]">{row.reason}</p>
                  ) : null}
                </>
              ),
            },
            {
              label: "Requested",
              className: "text-base md:whitespace-nowrap",
              render: (row) => formatDateTime(row.requestedAt),
            },
            {
              label: "Status",
              render: (row) => <StatusCell row={row} />,
            },
            {
              label: "Action",
              render: (row) =>
                row.status === "PENDING" ? (
                  <div className="flex flex-wrap justify-end gap-2 md:justify-start">
                    <Button disabled={busy} onClick={() => openAction(row, "approve")}>
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => openAction(row, "reject")}
                    >
                      Reject
                    </Button>
                  </div>
                ) : (
                  <Button disabled={busy} onClick={() => openAction(row, "disburse")}>
                    Pay out
                  </Button>
                ),
            },
          ]}
        />

        {queue.recent.length ? (
          <div className="space-y-3 pt-2">
            <h3 className="text-lg font-semibold">Recently closed</h3>
            <ResponsiveDataList
              rows={queue.recent}
              getRowId={(row) => row.id}
              emptyMessage=""
              columns={[
                {
                  label: "Member",
                  className: "text-base",
                  render: (row) => `${row.member.name} (${row.member.memberNumber})`,
                },
                {
                  label: "Amount",
                  className: "text-base tabular-nums md:whitespace-nowrap",
                  render: (row) => formatCurrency(row.amount),
                },
                {
                  label: "Status",
                  render: (row) => <StatusCell row={row} />,
                },
                {
                  label: "Handled by",
                  className: "text-base",
                  render: (row) =>
                    row.status === "CANCELLED"
                      ? "Member"
                      : (row.disbursedBy ?? row.reviewedBy ?? "—"),
                },
              ]}
            />
          </div>
        ) : null}
      </CardContent>

      <ResponsiveDialog
        open={!!action && !!selected}
        title={
          action === "disburse"
            ? "Confirm withdrawal payout"
            : action === "reject"
              ? "Reject withdrawal request"
              : "Approve withdrawal request"
        }
        onClose={closeAction}
      >
        {selected ? (
          <form onSubmit={submit} className="space-y-4">
            {error ? <Notice error>{error}</Notice> : null}
            <div className="rounded-[24px] bg-[var(--surface-muted)] px-4 py-4 text-base">
              <p className="font-semibold">
                {selected.member.name} · {selected.member.memberNumber}
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {formatCurrency(selected.amount)}
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Current balance {formatCurrency(selected.member.balance)} · {payoutLabel(selected)}
              </p>
            </div>
            {action === "disburse" ? (
              <>
                <Field label="Payout reference (optional)">
                  <Input
                    className="text-base"
                    maxLength={80}
                    placeholder="Mobile money or bank transaction ID"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </Field>
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
                  I have paid this amount to the member and confirm debiting their
                  savings.
                </label>
              </>
            ) : (
              <Field
                label={action === "reject" ? "Reason for rejection" : "Comment (optional)"}
              >
                <textarea
                  required={action === "reject"}
                  minLength={action === "reject" ? 3 : undefined}
                  maxLength={500}
                  className={`${selectClass} min-h-24 py-3`}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </Field>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={busy} onClick={closeAction}>
                Go back
              </Button>
              <Button
                type="submit"
                disabled={busy}
                variant={action === "reject" ? "danger" : "default"}
              >
                {busy
                  ? "Saving…"
                  : action === "disburse"
                    ? "Confirm payout"
                    : action === "reject"
                      ? "Confirm rejection"
                      : "Confirm approval"}
              </Button>
            </div>
          </form>
        ) : null}
      </ResponsiveDialog>
    </Card>
  );
}
