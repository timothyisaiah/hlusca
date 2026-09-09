import { json } from "@/lib/api";
import { loanMutation, loanRead } from "@/lib/loans/routes";
import { dividendRunSchema } from "@/lib/investments/schemas";
import { listRuns, proposeRun } from "@/lib/investments/service";

export const GET = loanRead(async (_request, actor) =>
  json(await listRuns(actor)),
);
export const POST = loanMutation({
  action: "CREATE",
  entityType: "DividendRun",
  roles: ["TREASURER"],
  schema: dividendRunSchema,
  execute: (tx, actor, _id, input) => proposeRun(tx, actor, input),
});
