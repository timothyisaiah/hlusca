import { loanMutation } from "@/lib/loans/routes";
import { dividendPostSchema } from "@/lib/investments/schemas";
import { postRun } from "@/lib/investments/service";

export const POST = loanMutation({
  action: "DISBURSE",
  entityType: "DividendRun",
  roles: ["TREASURER"],
  schema: dividendPostSchema,
  execute: (tx, actor, id, input) => postRun(tx, actor, id, input),
});
