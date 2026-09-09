import { loanMutation } from "@/lib/loans/routes";
import { investmentStatusSchema } from "@/lib/investments/schemas";
import { closeInvestment } from "@/lib/investments/service";

export const PATCH = loanMutation({
  action: "UPDATE",
  entityType: "MemberInvestment",
  roles: ["ADMIN"],
  schema: investmentStatusSchema,
  execute: (tx, actor, id, input) =>
    closeInvestment(tx, actor, id, input.status),
});
