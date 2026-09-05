import { loanMutation } from "@/lib/loans/routes";
import { decisionSchema } from "@/lib/loans/schemas";
import { reviewApplication } from "@/lib/loans/service";

export const POST = loanMutation({
  action: "APPROVE",
  entityType: "LoanApplication",
  roles: ["TREASURER", "BOARD"],
  schema: decisionSchema,
  execute: (tx, actor, id, payload) =>
    reviewApplication(tx, actor, id, "APPROVED", payload.comment),
});
