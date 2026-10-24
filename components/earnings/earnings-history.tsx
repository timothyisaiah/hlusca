"use client";

import { ResponsiveDataList } from "@/components/tables/responsive-data-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EarningsHistoryRecord } from "@/lib/earnings/types";
import { formatCurrency, formatDate, formatMonth } from "@/lib/utils";

export function EarningsHistory({ rows }: { rows: EarningsHistoryRecord[] }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Loan earnings history</CardTitle>
        <CardDescription>
          Your monthly share of interest paid by borrowers, credited to your savings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveDataList
          rows={rows}
          getRowId={(row) => row.id}
          emptyMessage="Your loan earnings will appear here once the Treasurer posts a monthly earnings run."
          columns={[
            {
              label: "Month",
              className: "text-base",
              render: (row) => formatMonth(row.run.month),
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
              label: "Credited",
              className: "text-base",
              render: (row) => (row.run.postedAt ? formatDate(row.run.postedAt) : "—"),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
