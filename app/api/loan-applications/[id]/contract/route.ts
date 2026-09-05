import { z } from "zod";
import { loanMutation } from "@/lib/loans/routes";
import { generateContract } from "@/lib/loans/service";

export const POST = loanMutation({
  action: "CREATE",
  entityType: "LoanContract",
  roles: ["TREASURER", "BOARD"],
  schema: z.object({}),
  execute: (tx, actor, id) => generateContract(tx, actor, id),
});
