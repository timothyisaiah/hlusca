import { loanMutation } from "@/lib/loans/routes";
import { withdrawalDisburseSchema } from "@/lib/savings/schemas";
import { disburseWithdrawalRequest } from "@/lib/savings/withdrawals";

export const POST = loanMutation({
  action: "WITHDRAW",
  entityType: "WithdrawalRequest",
  roles: ["TREASURER"],
  schema: withdrawalDisburseSchema,
  execute: (tx, actor, id, input) =>
    disburseWithdrawalRequest(tx, actor, id, input),
});
