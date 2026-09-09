import { json } from "@/lib/api";
import { loanRead } from "@/lib/loans/routes";
import { memberFilterSchema } from "@/lib/investments/schemas";
import { dividendHistory } from "@/lib/investments/service";

export const GET = loanRead(async (request, actor) => {
  const { memberId } = memberFilterSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  return json(await dividendHistory(actor, memberId));
});
