"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ResponsiveDataList } from "@/components/tables/responsive-data-list";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import {
  filterStatementRows,
  statementFiltersSchema,
  type LoanStatement,
} from "@/lib/loans/statement-types";
import { Field, loanRequest, Notice, selectClass } from "./shared";

const moneyClass = "whitespace-nowrap text-base tabular-nums";
const pageSize = 12;

function Pages({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-base">
      <span>
        {total} {total === 1 ? "entry" : "entries"} · Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function RepaymentWorkspace({
  statement: data,
  canRecord,
}: {
  statement: LoanStatement;
  canRecord: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(data.today);
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [target, setTarget] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    type: "",
    query: "",
  });
  const [page, setPage] = useState(1);
  const [schedulePage, setSchedulePage] = useState(1);
  const parsed = statementFiltersSchema.safeParse(
    Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== ""),
    ),
  );
  const rows = parsed.success
    ? filterStatementRows(data.rows, parsed.data)
    : [];
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(rows.length / pageSize)),
  );
  function changeFilter(key: keyof typeof filters, value: string) {
    setFilters((old) => ({ ...old, [key]: value }));
    setPage(1);
  }
  function review(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setConfirm(true);
  }
  async function record() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await loanRequest<{
        outstandingBalance: string;
        status: string;
      }>(`/api/loans/${data.loanId}/payments`, {
        amount,
        paymentDate,
        method,
        reference,
        ...(target ? { targetInstallmentNumber: Number(target) } : {}),
        confirm: true,
      });
      setConfirm(false);
      setAmount("");
      setReference("");
      setTarget("");
      setMessage(
        `Payment recorded. ${result.status === "CLOSED" ? "The loan is fully repaid and closed." : `Remaining scheduled balance: ${formatCurrency(result.outstandingBalance)}.`}`,
      );
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not record payment.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function download(format: "pdf" | "csv") {
    if (!parsed.success || exporting) return;
    setExporting(true);
    setError("");
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value !== ""),
      );
      query.set("format", format);
      const response = await fetch(
        `/api/loans/${data.loanId}/statement?${query}`,
      );
      if (!response.ok)
        throw new Error((await response.json()).error ?? "Export failed.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `hlusca-loan-${data.loanId}.${format}`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="grid min-w-0 gap-6" id="repayments">
      {message && <Notice>{message}</Notice>}
      {error && !confirm && <Notice error>{error}</Notice>}
      <Card className="min-w-0">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Loan repayments</CardTitle>
            <Badge>{titleCase(data.status)}</Badge>
          </div>
          <p className="text-base text-[var(--muted-foreground)]">
            Disbursed {formatDate(data.disbursementDate)}. The balance includes
            all scheduled principal and interest.
          </p>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Original principal", data.principal],
              ["Scheduled interest", data.totalInterest],
              ["Total paid", data.totalPaid],
              ["Remaining balance", data.outstandingBalance],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-sm text-[var(--muted-foreground)]">
                  {label}
                </dt>
                <dd className="mt-1 break-words text-xl font-semibold tabular-nums">
                  {formatCurrency(value)}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      {canRecord && data.status !== "CLOSED" && (
        <Card>
          <CardHeader>
            <CardTitle>Record a repayment</CardTitle>
            <p className="text-base text-[var(--muted-foreground)]">
              Record money received by cash, bank, or mobile money. Enter the
              receipt reference once per payment.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={review} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Payment amount (UGX)">
                  <Input
                    className="text-base"
                    inputMode="decimal"
                    required
                    pattern="[0-9]+([.][0-9]{1,2})?"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Payment date">
                  <Input
                    className="text-base"
                    type="date"
                    required
                    min={data.disbursementDate}
                    max={data.today}
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </Field>
                <Field label="Payment method">
                  <select
                    className={selectClass}
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                    <option value="MOBILE_MONEY">Mobile money</option>
                  </select>
                </Field>
                <Field label="Receipt reference">
                  <Input
                    className="text-base"
                    required
                    maxLength={100}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Receipt or transaction number"
                  />
                </Field>
                <Field label="Apply to installment">
                  <select
                    className={selectClass}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  >
                    <option value="">Oldest unpaid first</option>
                    {data.schedule.map((row) => (
                      <option key={row.id} value={row.installmentNumber}>
                        #{row.installmentNumber} · {row.dueDate} ·{" "}
                        {formatCurrency(row.remainingDue)} remaining
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <p className="text-base text-[var(--muted-foreground)]">
                Interest is paid first within each installment. Extra money
                covers other unpaid installments, oldest first. You can also use
                a reference such as INST-3/RECEIPT-123 to select installment 3.
              </p>
              <p className="text-base text-[var(--muted-foreground)]">
                Payment dates use Kampala time. A backdated receipt recalculates
                how earlier payments are matched.
              </p>
              <Button
                type="submit"
                className="sm:justify-self-start"
                disabled={busy}
              >
                Review payment
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      <Card className="min-w-0">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Loan statement</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={exporting || !parsed.success}
                onClick={() => download("pdf")}
              >
                Download PDF
              </Button>
              <Button
                variant="outline"
                disabled={exporting || !parsed.success}
                onClick={() => download("csv")}
              >
                Download CSV
              </Button>
            </div>
          </div>
          <p className="text-base text-[var(--muted-foreground)]">
            Payment components are amounts paid. Running balances include
            earlier transactions outside the selected filters.
          </p>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Statement from">
              <Input
                className="text-base"
                type="date"
                value={filters.from}
                onChange={(e) => changeFilter("from", e.target.value)}
              />
            </Field>
            <Field label="Statement to">
              <Input
                className="text-base"
                type="date"
                value={filters.to}
                onChange={(e) => changeFilter("to", e.target.value)}
              />
            </Field>
            <Field label="Transaction type">
              <select
                className={selectClass}
                value={filters.type}
                onChange={(e) => changeFilter("type", e.target.value)}
              >
                <option value="">All transactions</option>
                <option value="DISBURSEMENT">Opening scheduled debt</option>
                <option value="PAYMENT">Payments</option>
              </select>
            </Field>
            <Field label="Find receipt">
              <Input
                className="text-base"
                value={filters.query}
                maxLength={100}
                onChange={(e) => changeFilter("query", e.target.value)}
                placeholder="Receipt reference"
              />
            </Field>
          </div>
          {!parsed.success && (
            <Notice error>
              Choose a valid date range with the start date on or before the end
              date.
            </Notice>
          )}
          <ResponsiveDataList
            rows={rows.slice(
              (currentPage - 1) * pageSize,
              currentPage * pageSize,
            )}
            getRowId={(row) => row.id}
            emptyMessage="No transactions match these filters."
            columns={[
              {
                label: "Date / transaction",
                className: "min-w-44",
                render: (row) => (
                  <div className="grid gap-1 text-base">
                    <span>{formatDate(row.date)}</span>
                    <span className="font-medium">
                      {row.type === "PAYMENT"
                        ? "Payment received"
                        : "Opening scheduled debt"}
                    </span>
                    {row.method && (
                      <span className="text-sm">{titleCase(row.method)}</span>
                    )}
                    <span className="break-all text-sm text-[var(--muted-foreground)]">
                      {row.reference}
                    </span>
                    {!!row.allocations.length && (
                      <details className="text-sm">
                        <summary className="min-h-11 cursor-pointer py-3">
                          Installment matches
                        </summary>
                        {row.allocations.map((a) => (
                          <p key={a.installmentNumber} className="py-1">
                            #{a.installmentNumber}: principal{" "}
                            {formatCurrency(a.principal)}, interest{" "}
                            {formatCurrency(a.interest)}
                          </p>
                        ))}
                      </details>
                    )}
                  </div>
                ),
              },
              {
                label: "Principal",
                render: (row) => (
                  <span className={moneyClass}>
                    {formatCurrency(row.principal)}
                  </span>
                ),
              },
              {
                label: "Interest",
                render: (row) => (
                  <span className={moneyClass}>
                    {formatCurrency(row.interest)}
                  </span>
                ),
              },
              {
                label: "Running balance",
                render: (row) => (
                  <span className={`${moneyClass} font-semibold`}>
                    {formatCurrency(row.balance)}
                  </span>
                ),
              },
            ]}
          />
          <Pages page={currentPage} total={rows.length} onChange={setPage} />
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Repayment schedule</CardTitle>
          <p className="text-base text-[var(--muted-foreground)]">
            Amounts paid and remaining for every installment. Overdue rows may
            be partially paid.
          </p>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-5">
          <ResponsiveDataList
            rows={data.schedule.slice(
              (schedulePage - 1) * pageSize,
              schedulePage * pageSize,
            )}
            getRowId={(row) => row.id}
            emptyMessage="No installments."
            columns={[
              {
                label: "Installment / due",
                render: (row) => (
                  <div className="text-base">
                    <p className="font-medium">#{row.installmentNumber}</p>
                    <p className="whitespace-nowrap">
                      {formatDate(row.dueDate)}
                    </p>
                  </div>
                ),
              },
              {
                label: "Scheduled",
                render: (row) => (
                  <div className={moneyClass}>
                    <p>{formatCurrency(row.totalDue)}</p>
                    <p className="text-sm">
                      Principal {formatCurrency(row.principalDue)}
                    </p>
                    <p className="text-sm">
                      Interest {formatCurrency(row.interestDue)}
                    </p>
                  </div>
                ),
              },
              {
                label: "Paid",
                render: (row) => (
                  <div className={moneyClass}>
                    <p>{formatCurrency(row.totalPaid)}</p>
                    <p className="text-sm">
                      Principal {formatCurrency(row.principalPaid)}
                    </p>
                    <p className="text-sm">
                      Interest {formatCurrency(row.interestPaid)}
                    </p>
                  </div>
                ),
              },
              {
                label: "Remaining",
                render: (row) => (
                  <span className={`${moneyClass} font-semibold`}>
                    {formatCurrency(row.remainingDue)}
                  </span>
                ),
              },
              {
                label: "Status",
                render: (row) => <Badge>{titleCase(row.status)}</Badge>,
              },
            ]}
          />
          <Pages
            page={schedulePage}
            total={data.schedule.length}
            onChange={setSchedulePage}
          />
        </CardContent>
      </Card>
      <ResponsiveDialog
        open={confirm}
        title="Confirm repayment"
        onClose={() => {
          if (!busy) setConfirm(false);
        }}
      >
        <div className="grid gap-5 text-base">
          {error && <Notice error>{error}</Notice>}
          <p>
            Record <strong>{formatCurrency(amount || "0")}</strong> received
            from <strong>{data.memberName}</strong> ({data.memberNumber})?
          </p>
          <dl className="grid gap-3">
            <div>
              <dt className="text-sm text-[var(--muted-foreground)]">
                Date and method
              </dt>
              <dd>
                {formatDate(paymentDate)} · {titleCase(method)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--muted-foreground)]">
                Receipt reference
              </dt>
              <dd className="break-all">{reference.trim().toUpperCase()}</dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--muted-foreground)]">
                Matching
              </dt>
              <dd>
                {target
                  ? `Installment ${target} first`
                  : /^INST-/i.test(reference.trim())
                    ? `As indicated by ${reference.trim().toUpperCase()}`
                    : "Oldest unpaid installment first"}
              </dd>
            </div>
          </dl>
          <p>
            Confirm the amount and receipt details before recording this
            payment.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy} onClick={record}>
              {busy ? "Recording…" : "Confirm payment"}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Go back
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
