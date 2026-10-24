import { loanMutation } from "@/lib/loans/routes";
import { withdrawalRejectSchema } from "@/lib/savings/schemas";
import { reviewWithdrawalRequest } from "@/lib/savings/withdrawals";

export const POST = loanMutation({
  action: "REJECT",
  entityType: "WithdrawalRequest",
  roles: ["TREASURER"],
  schema: withdrawalRejectSchema,
  execute: (tx, actor, id, input) =>
    reviewWithdrawalRequest(tx, actor, id, "REJECTED", input),
});
