import { earningsPostSchema } from "@/lib/earnings/schemas";
import { postEarningsRun } from "@/lib/earnings/service";
import { loanMutation } from "@/lib/loans/routes";

export const POST = loanMutation({
  action: "DISBURSE",
  entityType: "EarningsRun",
  roles: ["TREASURER"],
  schema: earningsPostSchema,
  execute: (tx, actor, id, input) => postEarningsRun(tx, actor, id, input),
});
