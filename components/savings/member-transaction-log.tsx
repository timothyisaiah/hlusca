"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeDollarSign,
  Landmark,
  Sparkles,
} from "lucide-react";

import { ResponsiveDataList, type ResponsiveDataListColumn } from "@/components/tables/responsive-data-list";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SavingsTransactionRecord } from "@/lib/savings/types";
import { cn, formatCurrency, formatDateTime, titleCase } from "@/lib/utils";

type MemberTransactionLogProps = {
  memberId: string;
  transactions: SavingsTransactionRecord[];
  pageSize?: number;
  emptyMessage?: string;
};

const transactionTypes = [
  "DEPOSIT",
  "WITHDRAWAL",
  "INTEREST",
  "DIVIDEND",
  "LOAN_DISBURSEMENT",
  "LOAN_REPAYMENT",
] as const;

function getTransactionIcon(type: SavingsTransactionRecord["type"]) {
  switch (type) {
    case "DEPOSIT":
      return {
        Icon: ArrowDownLeft,
        iconClassName: "bg-[var(--accent-soft)] text-[var(--accent-ink)]",
        amountClassName: "text-[var(--accent-ink)]",
      };
    case "WITHDRAWAL":
      return {
        Icon: ArrowUpRight,
        iconClassName: "bg-[#ffe7ef] text-[#b14a72]",
        amountClassName: "text-[#9f2f59]",
      };
    case "INTEREST":
    case "DIVIDEND":
      return {
        Icon: Sparkles,
        iconClassName: "bg-[#eef6ff] text-[#4d78d5]",
        amountClassName: "text-[#355fb8]",
      };
    case "LOAN_DISBURSEMENT":
    case "LOAN_REPAYMENT":
      return {
        Icon: Landmark,
        iconClassName: "bg-[#effaf2] text-[#2c8f58]",
        amountClassName: "text-[#1f7a48]",
      };
    default:
      return {
        Icon: BadgeDollarSign,
        iconClassName: "bg-[var(--surface-muted)] text-[var(--muted-foreground)]",
        amountClassName: "text-[var(--foreground)]",
      };
  }
}

function matchesDateRange(createdAt: string, from: string, to: string) {
  const time = new Date(createdAt).getTime();

  if (from) {
    const fromTime = new Date(`${from}T00:00:00`).getTime();
    if (time < fromTime) {
      return false;
    }
  }

  if (to) {
    const toTime = new Date(`${to}T23:59:59.999`).getTime();
    if (time > toTime) {
      return false;
    }
  }

  return true;
}

export function MemberTransactionLog({
  memberId,
  transactions,
  pageSize = 6,
  emptyMessage = "No savings transactions have been recorded yet.",
}: MemberTransactionLogProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return transactions.filter((transaction) => {
      if (typeFilter && transaction.type !== typeFilter) {
        return false;
      }

      if (!matchesDateRange(transaction.createdAt, from, to)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        titleCase(transaction.type),
        transaction.reference ?? "",
        transaction.narrative ?? "",
        transaction.performedBy?.label ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [deferredQuery, from, to, transactions, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleTransactions = filteredTransactions.slice(pageStart, pageStart + pageSize);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("query", query.trim());
    }

    if (typeFilter) {
      params.set("type", typeFilter);
    }

    if (from) {
      params.set("from", from);
    }

    if (to) {
      params.set("to", to);
    }

    const suffix = params.toString();
    return suffix
      ? `/api/members/${memberId}/transactions?${suffix}`
      : `/api/members/${memberId}/transactions`;
  }, [from, memberId, query, to, typeFilter]);

  const columns: ResponsiveDataListColumn<SavingsTransactionRecord>[] = [
    {
      label: "Transaction",
      render: (transaction) => {
        const { Icon, iconClassName } = getTransactionIcon(transaction.type);

        return (
          <div className="flex items-start gap-3">
            <span className={cn("rounded-2xl p-2.5", iconClassName)}>
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold text-[var(--foreground)]">
                {titleCase(transaction.type)}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                {transaction.reference ?? transaction.narrative ?? "No note recorded."}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      label: "Amount",
      className: "whitespace-nowrap text-right",
      render: (transaction) => {
        const { amountClassName } = getTransactionIcon(transaction.type);

        return (
          <span className={cn("font-semibold tabular-nums", amountClassName)}>
            {formatCurrency(transaction.amount)}
          </span>
        );
      },
    },
    {
      label: "Balance After",
      className: "whitespace-nowrap text-right",
      render: (transaction) => (
        <span className="font-semibold tabular-nums text-[var(--foreground)]">
          {formatCurrency(transaction.balanceAfter)}
        </span>
      ),
    },
    {
      label: "Recorded By",
      render: (transaction) => (
        <div>
          <p className="font-medium text-[var(--foreground)]">
            {transaction.performedBy?.label ?? "System"}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            {transaction.performedBy?.role ?? "SYSTEM"}
          </p>
        </div>
      ),
    },
    {
      label: "Date",
      className: "whitespace-nowrap",
      render: (transaction) => formatDateTime(transaction.createdAt),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_170px_170px_auto]">
        <Input
          placeholder="Search notes, references, or recorder"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />

        <select
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value);
            setPage(1);
          }}
          className="h-11 rounded-2xl border border-[var(--surface-border)] bg-white px-4 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color:rgba(89,102,255,0.14)]"
        >
          <option value="">All types</option>
          {transactionTypes.map((type) => (
            <option key={type} value={type}>
              {titleCase(type)}
            </option>
          ))}
        </select>

        <Input
          type="date"
          aria-label="Filter from date"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value);
            setPage(1);
          }}
        />

        <Input
          type="date"
          aria-label="Filter to date"
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setPage(1);
          }}
        />

        <div className="flex flex-wrap gap-2">
          <a
            href={`${exportHref}${exportHref.includes("?") ? "&" : "?"}format=csv`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Export CSV
          </a>
          <a
            href={`${exportHref}${exportHref.includes("?") ? "&" : "?"}format=pdf`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Export PDF
          </a>
        </div>
      </div>

      <ResponsiveDataList
        rows={visibleTransactions}
        columns={columns}
        getRowId={(transaction) => transaction.id}
        emptyMessage={emptyMessage}
        mobileCardClassName="overflow-hidden"
        mobileCard={(transaction) => {
          const { Icon, iconClassName, amountClassName } = getTransactionIcon(
            transaction.type,
          );

          return (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className={cn("rounded-2xl p-2.5", iconClassName)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--foreground)]">
                        {titleCase(transaction.type)}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                        {transaction.reference ?? transaction.narrative ?? "No note recorded."}
                      </p>
                    </div>
                    <p className={cn("text-right text-sm font-semibold tabular-nums", amountClassName)}>
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-3xl bg-[var(--surface-muted)] px-4 py-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    Balance After
                  </p>
                  <p className="mt-1 font-semibold tabular-nums text-[var(--foreground)]">
                    {formatCurrency(transaction.balanceAfter)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    Recorded By
                  </p>
                  <p className="mt-1 font-semibold text-[var(--foreground)]">
                    {transaction.performedBy?.label ?? "System"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    Date
                  </p>
                  <p className="mt-1 font-semibold text-[var(--foreground)]">
                    {formatDateTime(transaction.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        }}
      />

      <div className="flex flex-col gap-3 rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">
          Showing{" "}
          <span className="font-semibold text-[var(--foreground)]">
            {filteredTransactions.length === 0 ? 0 : pageStart + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-[var(--foreground)]">
            {Math.min(pageStart + pageSize, filteredTransactions.length)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-[var(--foreground)]">
            {filteredTransactions.length}
          </span>{" "}
          filtered transaction{filteredTransactions.length === 1 ? "" : "s"}.
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </Button>
          <span className="px-2 text-sm font-medium text-[var(--muted-foreground)]">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
