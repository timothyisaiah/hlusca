import { earningsCancelSchema } from "@/lib/earnings/schemas";
import { cancelEarningsRun } from "@/lib/earnings/service";
import { loanMutation } from "@/lib/loans/routes";

export const POST = loanMutation({
  action: "UPDATE",
  entityType: "EarningsRun",
  roles: ["TREASURER"],
  schema: earningsCancelSchema,
  execute: (tx, actor, id) => cancelEarningsRun(tx, actor, id),
});
