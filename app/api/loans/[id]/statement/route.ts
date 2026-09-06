import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, handleRouteError, json } from "@/lib/api";
import { runAuditedMutation } from "@/lib/audit/mutation";
import { getRequestMetadata } from "@/lib/audit/request";
import { authOptions } from "@/lib/auth/options";
import { getLoanActor, snapshot } from "@/lib/loans/service";
import { getLoanStatement } from "@/lib/loans/statement";
import {
  filterStatementRows,
  statementFiltersSchema,
} from "@/lib/loans/statement-types";
import { statementCsv, statementPdf } from "@/lib/loans/statement-export";

export async function GET(
  request: NextRequest,
  context: { params?: Promise<{ id?: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const { id = "" } = (await context.params) ?? {};
    const raw = Object.fromEntries(request.nextUrl.searchParams);
    if (raw.format !== undefined) {
      return await runAuditedMutation(
        {
          actorId: session?.user?.id,
          actorRole: session?.user?.role,
          action: "EXPORT",
          entityType: "LoanStatement",
          entityId: id,
          ...getRequestMetadata(request),
        },
        async (tx) => {
          const actor = await getLoanActor(session?.user?.id, tx);
          const format = z.enum(["pdf", "csv"]).parse(raw.format);
          const filters = statementFiltersSchema.parse(raw);
          const statement = await getLoanStatement(id, actor, tx);
          const rows = filterStatementRows(statement.rows, filters);
          if (rows.length > 5000)
            throw new ApiError(
              "Narrow your filters to export at most 5,000 transactions.",
            );
          return {
            result: new Response(
              format === "pdf"
                ? statementPdf(statement, rows, filters)
                : statementCsv(statement, rows),
              {
                headers: {
                  "Content-Type":
                    format === "pdf"
                      ? "application/pdf"
                      : "text/csv; charset=utf-8",
                  "Content-Disposition": `attachment; filename="hlusca-loan-${statement.loanId}.${format}"`,
                  "Cache-Control": "private, no-store",
                },
              },
            ),
            afterState: snapshot({
              loanId: id,
              filters,
              format,
              count: rows.length,
            }),
          };
        },
      );
    }
    const actor = await getLoanActor(session?.user?.id);
    const filters = statementFiltersSchema.parse(raw);
    const statement = await getLoanStatement(id, actor);
    const rows = filterStatementRows(statement.rows, filters);
    const pageSize = 20;
    return json(
      {
        ...statement,
        rows: rows.slice(
          (filters.page - 1) * pageSize,
          filters.page * pageSize,
        ),
        total: rows.length,
        page: filters.page,
        pageSize,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
