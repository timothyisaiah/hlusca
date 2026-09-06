import type { NextRequest } from "next/server";
import { handleRouteError, json } from "@/lib/api";
import { runAuditedMutation } from "@/lib/audit/mutation";
import { getRequestMetadata } from "@/lib/audit/request";
import {
  authorizeOverdueJob,
  flagOverdueInstallments,
} from "@/lib/loans/overdue";
import { businessDate } from "@/lib/loans/reconciliation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const result = await runAuditedMutation(
      {
        action: "UPDATE",
        entityType: "LoanSchedule",
        metadata: { job: "loans-overdue" },
        ...getRequestMetadata(request),
      },
      async (tx) => {
        authorizeOverdueJob(
          request.headers.get("authorization"),
          process.env.CRON_SECRET,
        );
        return flagOverdueInstallments(tx, businessDate());
      },
    );
    return json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error);
  }
}
