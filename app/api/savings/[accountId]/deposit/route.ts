import type { NextRequest } from "next/server";

import { handleRouteError, json } from "@/lib/api";
import { getRequestMetadata } from "@/lib/audit/request";
import { withRouteAuth } from "@/lib/auth/rbac";
import { savingsMutationSchema } from "@/lib/savings/schemas";
import { recordSavingsTransaction } from "@/lib/savings/service";

const postDepositHandler = withRouteAuth<{ accountId: string }>(
  async (request, context, user) => {
    const { accountId } = await context.params;
    const payload = savingsMutationSchema.parse(await request.json());
    const result = await recordSavingsTransaction(
      {
        accountId,
        kind: "deposit",
        amount: payload.amount,
        reference: payload.reference,
        narrative: payload.narrative,
      },
      user,
      getRequestMetadata(request),
    );

    return json(result);
  },
  {
    roles: ["TREASURER"],
  },
);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ accountId: string }> },
) {
  try {
    return await postDepositHandler(request, context);
  } catch (error) {
    return handleRouteError(error);
  }
}
