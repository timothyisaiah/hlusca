import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, handleRouteError } from "@/lib/api";
import { runAuditedMutation } from "@/lib/audit/mutation";
import { getRequestMetadata } from "@/lib/audit/request";
import { authOptions } from "@/lib/auth/options";
import { applicationsCsv, applicationsPdf } from "@/lib/loans/export";
import { applicationFiltersSchema } from "@/lib/loans/schemas";
import { getLoanActor, listApplications, snapshot } from "@/lib/loans/service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    return await runAuditedMutation(
      {
        actorId: session?.user?.id,
        actorRole: session?.user?.role,
        action: "EXPORT",
        entityType: "LoanApplication",
        ...getRequestMetadata(request),
      },
      async (tx) => {
        const actor = await getLoanActor(session?.user?.id, tx);
        const format = z
          .enum(["csv", "pdf"])
          .parse(request.nextUrl.searchParams.get("format"));
        const filters = applicationFiltersSchema.parse({
          ...Object.fromEntries(request.nextUrl.searchParams),
          page: 1,
        });
        const data = await listApplications(actor, filters, tx, 5000);
        if (data.total > 5000)
          throw new ApiError(
            "Narrow your filters to export at most 5,000 applications.",
          );
        return {
          result: new Response(
            format === "csv"
              ? applicationsCsv(data.applications)
              : applicationsPdf(data.applications),
            {
              headers: {
                "Content-Type":
                  format === "csv"
                    ? "text/csv; charset=utf-8"
                    : "application/pdf",
                "Content-Disposition": `attachment; filename="hlusca-loan-applications.${format}"`,
                "Cache-Control": "private, no-store",
              },
            },
          ),
          afterState: snapshot({
            filters,
            format,
            count: data.applications.length,
          }),
        };
      },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
