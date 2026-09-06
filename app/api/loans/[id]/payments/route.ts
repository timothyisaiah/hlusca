import { loanMutation } from "@/lib/loans/routes";
import { paymentSchema } from "@/lib/loans/schemas";
import { recordLoanPayment } from "@/lib/loans/repayments";

export const POST = loanMutation({
  action: "CREATE",
  entityType: "LoanPayment",
  roles: ["TREASURER"],
  schema: paymentSchema,
  execute: recordLoanPayment,
});
