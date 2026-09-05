import { loanMutation } from "@/lib/loans/routes";
import { disbursementSchema } from "@/lib/loans/schemas";
import { disburseApplication } from "@/lib/loans/service";

export const POST = loanMutation({
  action: "DISBURSE",
  entityType: "Loan",
  roles: ["TREASURER"],
  schema: disbursementSchema,
  execute: (tx, actor, id, payload) =>
    disburseApplication(tx, actor, id, payload.password),
});
