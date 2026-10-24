import { WithdrawalRequestStatus } from "@prisma/client";
import { z } from "zod";

import { json } from "@/lib/api";
import { loanMutation, loanRead } from "@/lib/loans/routes";
import { withdrawalRequestSchema } from "@/lib/savings/schemas";
import {
  listWithdrawalRequests,
  submitWithdrawalRequest,
} from "@/lib/savings/withdrawals";

const querySchema = z.object({
  status: z.nativeEnum(WithdrawalRequestStatus).optional(),
  memberId: z.string().min(1).max(100).optional(),
});

export const GET = loanRead(async (request, actor) => {
  const filters = querySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  return json(await listWithdrawalRequests(actor, filters));
});

export const POST = loanMutation({
  action: "CREATE",
  entityType: "WithdrawalRequest",
  roles: ["CLIENT"],
  schema: withdrawalRequestSchema,
  execute: (tx, actor, _id, input) => submitWithdrawalRequest(tx, actor, input),
});
