import { json } from "@/lib/api";
import { loanMutation, loanRead } from "@/lib/loans/routes";
import {
  applicationFiltersSchema,
  applicationSchema,
} from "@/lib/loans/schemas";
import { listApplications, submitApplication } from "@/lib/loans/service";

export const GET = loanRead(async (request, actor) =>
  json(
    await listApplications(
      actor,
      applicationFiltersSchema.parse(
        Object.fromEntries(request.nextUrl.searchParams),
      ),
    ),
  ),
);
export const POST = loanMutation({
  action: "CREATE",
  entityType: "LoanApplication",
  roles: ["CLIENT"],
  schema: applicationSchema,
  execute: (tx, actor, _id, payload) => submitApplication(tx, actor, payload),
});
