import { json } from "@/lib/api";
import { memberFilterSchema } from "@/lib/earnings/schemas";
import { earningsHistory } from "@/lib/earnings/service";
import { loanRead } from "@/lib/loans/routes";

export const GET = loanRead(async (request, actor) => {
  const { memberId } = memberFilterSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  return json(await earningsHistory(actor, memberId));
});
