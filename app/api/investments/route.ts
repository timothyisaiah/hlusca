import { json } from "@/lib/api";
import { loanMutation, loanRead } from "@/lib/loans/routes";
import {
  investmentSchema,
  memberFilterSchema,
} from "@/lib/investments/schemas";
import { listInvestments, recordInvestment } from "@/lib/investments/service";

export const GET = loanRead(async (request, actor) => {
  const { memberId } = memberFilterSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  return json(await listInvestments(actor, memberId));
});
export const POST = loanMutation({
  action: "CREATE",
  entityType: "MemberInvestment",
  roles: ["ADMIN"],
  schema: investmentSchema,
  execute: (tx, actor, _id, input) => recordInvestment(tx, actor, input),
});
