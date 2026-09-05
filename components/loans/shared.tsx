"use client";

import { cloneElement, useId, type ReactElement, type ReactNode } from "react";
import { ResponsiveDataList } from "@/components/tables/responsive-data-list";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import type { ScheduleInstallment } from "@/lib/loans/schedule";

export const selectClass =
  "min-h-11 w-full rounded-2xl border border-[var(--surface-border)] bg-white px-3 text-base";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ id?: string }>;
}) {
  const generatedId = useId();
  const id = children.props.id ?? generatedId;
  return (
    <div className="grid gap-2 text-sm font-medium">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}

export function Notice({
  error,
  children,
}: {
  error?: boolean;
  children: ReactNode;
}) {
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-2xl p-4 text-base ${error ? "bg-red-50 text-red-800" : "bg-[var(--surface-muted)] text-[var(--foreground)]"}`}
    >
      {children}
    </p>
  );
}

export async function loanRequest<T>(
  url: string,
  body: unknown,
  method = "POST",
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    const fields = data.details?.fieldErrors as
      | Record<string, string[]>
      | undefined;
    throw new Error(
      fields
        ? Object.values(fields).flat().join(" ") || data.error
        : data.error || "The request failed.",
    );
  }
  return data;
}

export function ScheduleTable({
  schedule,
}: {
  schedule: (ScheduleInstallment & { status?: string })[];
}) {
  return (
    <ResponsiveDataList
      rows={schedule}
      getRowId={(row) => String(row.installmentNumber)}
      emptyMessage="No installments yet."
      columns={[
        {
          label: "Installment",
          render: (row) => (
            <span className="text-base">{row.installmentNumber}</span>
          ),
        },
        {
          label: "Due date",
          render: (row) => (
            <span className="text-base">{formatDate(row.dueDate)}</span>
          ),
        },
        {
          label: "Principal",
          render: (row) => (
            <span className="text-base tabular-nums">
              {formatCurrency(row.principalDue)}
            </span>
          ),
        },
        {
          label: "Interest",
          render: (row) => (
            <span className="text-base tabular-nums">
              {formatCurrency(row.interestDue)}
            </span>
          ),
        },
        {
          label: "Total due",
          render: (row) => (
            <span className="text-base font-semibold tabular-nums">
              {formatCurrency(row.totalDue)}
            </span>
          ),
        },
        ...(schedule.some((row) => row.status)
          ? [
              {
                label: "Status",
                render: (row: ScheduleInstallment & { status?: string }) =>
                  titleCase(row.status ?? "PENDING"),
              },
            ]
          : []),
      ]}
    />
  );
}
