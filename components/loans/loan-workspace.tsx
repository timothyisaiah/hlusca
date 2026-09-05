"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ResponsiveDataList } from "@/components/tables/responsive-data-list";
import type { LoanWorkspace as WorkspaceData } from "@/lib/loans/types";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import { Field, selectClass } from "./shared";

export function LoanWorkspace({
  data,
  role,
  initial,
}: {
  data: WorkspaceData;
  role: UserRole;
  initial: {
    query: string;
    status?: string;
    queue: string;
    from?: string;
    to?: string;
  };
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initial.query);
  const [status, setStatus] = useState(initial.status ?? "");
  const [queue, setQueue] = useState(initial.queue === "true");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");
  const reviewer = role === "TREASURER" || role === "BOARD";
  function navigate(page = 1) {
    const params = new URLSearchParams({
      query,
      page: String(page),
      queue: String(queue),
    });
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/dashboard/loans?${params}`);
  }
  function filter(event: FormEvent) {
    event.preventDefault();
    navigate();
  }
  const exportParams = new URLSearchParams(
    Object.entries(initial).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">
            {role === "CLIENT" ? "Your loans" : "Loan applications"}
          </h1>
          <p className="mt-2 text-base text-[var(--muted-foreground)]">
            {role === "CLIENT"
              ? "Track applications, sign contracts, and view repayment schedules."
              : "Review applications and follow their progress through disbursement."}
          </p>
        </div>
        {role === "CLIENT" && (
          <Link href="/dashboard/loans/apply" className={buttonVariants()}>
            Apply for a loan
          </Link>
        )}
        {role === "ADMIN" && (
          <Link href="/dashboard/admin/loan-types" className={buttonVariants()}>
            Configure loan types
          </Link>
        )}
      </div>
      <form
        onSubmit={filter}
        className="grid items-end gap-4 rounded-3xl bg-white p-5 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_auto]"
      >
        <Field label="Search applications">
          <Input
            className="text-base"
            value={query}
            maxLength={100}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Product, member name or number"
          />
        </Field>
        <Field label="Application status">
          <select
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"].map(
              (value) => (
                <option key={value} value={value}>
                  {titleCase(value)}
                </option>
              ),
            )}
          </select>
        </Field>
        <Field label="Submitted from (UTC)">
          <Input
            className="text-base"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="Submitted through (UTC)">
          <Input
            className="text-base"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
        {reviewer && (
          <label className="flex min-h-11 items-center gap-3 text-base">
            <input
              className="h-5 w-5"
              type="checkbox"
              checked={queue}
              onChange={(e) => setQueue(e.target.checked)}
            />
            Awaiting my review
          </label>
        )}
        <Button type="submit">Apply filters</Button>
      </form>
      <div className="flex flex-wrap gap-3">
        <a
          className={buttonVariants({ variant: "outline" })}
          href={`/api/loan-applications/export?${exportParams}&format=csv`}
        >
          Export CSV
        </a>
        <a
          className={buttonVariants({ variant: "outline" })}
          href={`/api/loan-applications/export?${exportParams}&format=pdf`}
        >
          Export PDF
        </a>
      </div>
      <ResponsiveDataList
        rows={data.applications}
        getRowId={(row) => row.id}
        emptyMessage={
          initial.queue === "true"
            ? "No applications are awaiting your review. Clear the review filter to see contracts and disbursements."
            : "No loan applications found."
        }
        columns={[
          {
            label: "Application",
            render: (row) => (
              <div>
                <p className="text-base font-semibold">{row.loanTypeName}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {formatDate(row.submittedAt)}
                </p>
              </div>
            ),
          },
          ...(role !== "CLIENT"
            ? [
                {
                  label: "Member",
                  render: (row: WorkspaceData["applications"][number]) => (
                    <div className="text-base">
                      {row.member.firstName} {row.member.lastName}
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {row.member.memberNumber}
                      </p>
                    </div>
                  ),
                },
              ]
            : []),
          {
            label: "Amount & term",
            render: (row) => (
              <div className="text-base tabular-nums">
                <p className="font-semibold">
                  {formatCurrency(row.amountRequested)}
                </p>
                <p>{row.termMonths} months</p>
              </div>
            ),
          },
          {
            label: "Progress",
            render: (row) => (
              <div className="space-y-2">
                <Badge>
                  {row.loan
                    ? "Disbursed"
                    : row.contract?.status === "SIGNED"
                      ? "Ready for disbursement"
                      : titleCase(row.status)}
                </Badge>
                {row.contract?.status === "AWAITING_SIGNATURE" && (
                  <p className="text-sm">Awaiting member signature</p>
                )}
                {row.rejectionReason && (
                  <p className="max-w-sm break-words text-sm text-red-800">
                    {row.rejectionReason}
                  </p>
                )}
              </div>
            ),
          },
          {
            label: "Action",
            render: (row) => (
              <Link
                className={buttonVariants({ variant: "outline" })}
                href={`/dashboard/loans/${row.id}`}
              >
                Open application
              </Link>
            ),
          },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          {data.total} application{data.total === 1 ? "" : "s"} · Page{" "}
          {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            disabled={data.page <= 1}
            onClick={() => navigate(data.page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={data.page * data.pageSize >= data.total}
            onClick={() => navigate(data.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
