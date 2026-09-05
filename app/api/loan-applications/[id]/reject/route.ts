import { loanMutation } from "@/lib/loans/routes";
import { rejectionSchema } from "@/lib/loans/schemas";
import { reviewApplication } from "@/lib/loans/service";

export const POST = loanMutation({
  action: "REJECT",
  entityType: "LoanApplication",
  roles: ["TREASURER", "BOARD"],
  schema: rejectionSchema,
  execute: (tx, actor, id, payload) =>
    reviewApplication(tx, actor, id, "REJECTED", payload.comment),
});
