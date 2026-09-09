import { loanMutation } from "@/lib/loans/routes";
import { productSchema } from "@/lib/investments/schemas";
import { saveProduct } from "@/lib/investments/service";

export const PATCH = loanMutation({
  action: "UPDATE",
  entityType: "InvestmentProduct",
  roles: ["ADMIN"],
  schema: productSchema,
  execute: (tx, actor, id, input) => saveProduct(tx, actor, input, id),
});
