import { loanMutation } from "@/lib/loans/routes";
import { dividendDecisionSchema } from "@/lib/investments/schemas";
import { decideRun } from "@/lib/investments/service";
import { z } from "zod";

export const POST = loanMutation({
  action: "APPROVE",
  entityType: "DividendRun",
  roles: ["BOARD"],
  schema: dividendDecisionSchema
    .omit({ decision: true })
    .extend({ decision: z.literal("APPROVED").default("APPROVED") }),
  execute: (tx, actor, id, input) => decideRun(tx, actor, id, input),
});
