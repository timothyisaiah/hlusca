"use client";

import { ResponsiveDataList } from "@/components/tables/responsive-data-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DividendHistoryRecord } from "@/lib/investments/types";

export function DividendHistory({ rows }: { rows: DividendHistoryRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dividend history</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveDataList
          rows={rows}
          getRowId={(row) => row.id}
          emptyMessage="Your posted dividends will appear here once a financial-year run is approved and credited to savings."
          columns={[
            {
              label: "Financial year",
              className: "text-base",
              render: (row) => row.run.financialYear,
            },
            {
              label: "Period",
              className: "text-base",
              render: (row) =>
                `${formatDate(row.run.periodStart)} – ${formatDate(row.run.periodEnd)}`,
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
            {
              label: "Posted",
              className: "text-base",
              render: (row) =>
                row.run.postedAt ? formatDate(row.run.postedAt) : "—",
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
