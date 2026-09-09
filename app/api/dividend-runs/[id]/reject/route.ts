import { loanMutation } from "@/lib/loans/routes";
import { dividendDecisionSchema } from "@/lib/investments/schemas";
import { decideRun } from "@/lib/investments/service";
import { z } from "zod";

export const POST = loanMutation({
  action: "REJECT",
  entityType: "DividendRun",
  roles: ["BOARD"],
  schema: dividendDecisionSchema
    .omit({ decision: true })
    .extend({ decision: z.literal("REJECTED").default("REJECTED") }),
  execute: (tx, actor, id, input) => decideRun(tx, actor, id, input),
});
