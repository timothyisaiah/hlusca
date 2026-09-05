import { loanMutation } from "@/lib/loans/routes";
import { signatureSchema } from "@/lib/loans/schemas";
import { signContract } from "@/lib/loans/service";

export const POST = loanMutation({
  action: "SIGN",
  entityType: "LoanContract",
  roles: ["CLIENT"],
  schema: signatureSchema,
  execute: (tx, actor, id, payload, metadata) =>
    signContract(tx, actor, id, payload, metadata),
});
