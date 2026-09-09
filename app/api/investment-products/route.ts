import { json } from "@/lib/api";
import { loanMutation, loanRead } from "@/lib/loans/routes";
import { productSchema } from "@/lib/investments/schemas";
import { listProducts, saveProduct } from "@/lib/investments/service";

export const GET = loanRead(async (_request, actor) =>
  json(await listProducts(actor)),
);
export const POST = loanMutation({
  action: "CREATE",
  entityType: "InvestmentProduct",
  roles: ["ADMIN"],
  schema: productSchema,
  execute: (tx, actor, _id, input) => saveProduct(tx, actor, input),
});
