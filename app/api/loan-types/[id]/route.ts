import { loanMutation } from "@/lib/loans/routes";
import { loanTypeSchema } from "@/lib/loans/schemas";
import { saveLoanType } from "@/lib/loans/service";

export const PATCH = loanMutation({
  action: "UPDATE",
  entityType: "LoanType",
  roles: ["ADMIN"],
  schema: loanTypeSchema,
  execute: (tx, actor, id, payload) => saveLoanType(tx, actor, payload, id),
});
