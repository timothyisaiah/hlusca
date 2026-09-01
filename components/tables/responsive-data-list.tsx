import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ResponsiveDataListColumn<Row> = {
  label: string;
  render: (row: Row) => ReactNode;
  className?: string;
};

type ResponsiveDataListProps<Row> = {
  rows: Row[];
  columns: ResponsiveDataListColumn<Row>[];
  getRowId: (row: Row) => string;
  emptyMessage: string;
  mobileCard?: (row: Row) => ReactNode;
  mobileCardClassName?: string;
};

export function ResponsiveDataList<Row>({
  rows,
  columns,
  getRowId,
  emptyMessage,
  mobileCard,
  mobileCardClassName,
}: ResponsiveDataListProps<Row>) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl bg-[var(--surface-muted)] px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article
            key={getRowId(row)}
            className={cn(
              "rounded-3xl border border-[var(--surface-border)] bg-white p-4 shadow-sm",
              mobileCardClassName,
            )}
          >
            {mobileCard ? (
              mobileCard(row)
            ) : (
              <dl className="space-y-3">
                {columns.map((column) => (
                  <div key={column.label} className="flex items-start justify-between gap-4">
                    <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                      {column.label}
                    </dt>
                    <dd className={cn("min-w-0 text-right text-sm", column.className)}>
                      {column.render(row)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[28px] border border-[var(--surface-border)] bg-white md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--surface-muted)] text-[var(--muted-foreground)]">
            <tr>
              {columns.map((column) => (
                <th key={column.label} className="px-5 py-4 font-semibold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowId(row)}
                className="border-t border-[var(--surface-border)] align-top"
              >
                {columns.map((column) => (
                  <td key={column.label} className={cn("px-5 py-4", column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
