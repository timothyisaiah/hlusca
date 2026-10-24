import { json } from "@/lib/api";
import { earningsRunSchema } from "@/lib/earnings/schemas";
import { listEarningsRuns, proposeEarningsRun } from "@/lib/earnings/service";
import { loanMutation, loanRead } from "@/lib/loans/routes";

export const GET = loanRead(async (_request, actor) =>
  json(await listEarningsRuns(actor)),
);

export const POST = loanMutation({
  action: "CREATE",
  entityType: "EarningsRun",
  roles: ["TREASURER"],
  schema: earningsRunSchema,
  execute: (tx, actor, _id, input) => proposeEarningsRun(tx, actor, input),
});
