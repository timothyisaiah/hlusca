import type { NextRequest } from "next/server";

import { handleRouteError, json } from "@/lib/api";
import { assertCanAccessMember, withRouteAuth } from "@/lib/auth/rbac";
import { buildTransactionLedgerPdf } from "@/lib/pdf";
import { buildSavingsExportFilename, buildTransactionsCsv } from "@/lib/savings/export";
import { savingsLedgerQuerySchema } from "@/lib/savings/schemas";
import { listMemberTransactions } from "@/lib/savings/service";

const getTransactionsHandler = withRouteAuth<{ id: string }>(
  async (request, context, user) => {
    const { id } = await context.params;

    if (user.role === "CLIENT") {
      assertCanAccessMember(user, id);
    }

    const query = savingsLedgerQuerySchema.parse({
      query: request.nextUrl.searchParams.get("query") ?? undefined,
      type: request.nextUrl.searchParams.get("type") ?? undefined,
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      pageSize: request.nextUrl.searchParams.get("pageSize") ?? undefined,
      format: request.nextUrl.searchParams.get("format") ?? undefined,
    });

    const ledger = await listMemberTransactions(id, {
      query: query.query,
      type: query.type,
      from: query.from,
      to: query.to,
      page: query.page,
      pageSize: query.pageSize,
      takeAll: query.format !== "json",
    });

    if (query.format === "csv") {
      return new Response(buildTransactionsCsv(ledger.member, ledger.transactions), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${buildSavingsExportFilename(
            ledger.member.memberNumber,
            "csv",
          )}"`,
        },
      });
    }

    if (query.format === "pdf") {
      return new Response(
        buildTransactionLedgerPdf({
          memberName: `${ledger.member.firstName} ${ledger.member.lastName}`,
          memberNumber: ledger.member.memberNumber,
          generatedAt: new Date(),
          summary: ledger.summary,
          transactions: ledger.transactions,
        }),
        {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${buildSavingsExportFilename(
              ledger.member.memberNumber,
              "pdf",
            )}"`,
          },
        },
      );
    }

    return json(ledger);
  },
  {
    roles: ["CLIENT", "TREASURER", "BOARD", "ADMIN"],
  },
);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    return await getTransactionsHandler(request, context);
  } catch (error) {
    return handleRouteError(error);
  }
}
