import { json } from "@/lib/api";
import { loanMutation, loanRead } from "@/lib/loans/routes";
import { loanTypeSchema } from "@/lib/loans/schemas";
import { listLoanTypes, saveLoanType } from "@/lib/loans/service";

export const GET = loanRead(async (_request, actor) =>
  json(await listLoanTypes(actor)),
);
export const POST = loanMutation({
  action: "CREATE",
  entityType: "LoanType",
  roles: ["ADMIN"],
  schema: loanTypeSchema,
  execute: (tx, actor, _id, payload) => saveLoanType(tx, actor, payload),
});
