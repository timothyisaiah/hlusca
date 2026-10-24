import { loanMutation } from "@/lib/loans/routes";
import { withdrawalCancelSchema } from "@/lib/savings/schemas";
import { cancelWithdrawalRequest } from "@/lib/savings/withdrawals";

export const POST = loanMutation({
  action: "UPDATE",
  entityType: "WithdrawalRequest",
  roles: ["CLIENT"],
  schema: withdrawalCancelSchema,
  execute: (tx, actor, id) => cancelWithdrawalRequest(tx, actor, id),
});
