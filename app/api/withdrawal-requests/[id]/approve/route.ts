import { loanMutation } from "@/lib/loans/routes";
import { withdrawalApproveSchema } from "@/lib/savings/schemas";
import { reviewWithdrawalRequest } from "@/lib/savings/withdrawals";

export const POST = loanMutation({
  action: "APPROVE",
  entityType: "WithdrawalRequest",
  roles: ["TREASURER"],
  schema: withdrawalApproveSchema,
  execute: (tx, actor, id, input) =>
    reviewWithdrawalRequest(tx, actor, id, "APPROVED", input),
});
