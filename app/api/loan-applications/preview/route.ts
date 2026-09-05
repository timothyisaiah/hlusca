import { json } from "@/lib/api";
import { loanRead } from "@/lib/loans/routes";
import { previewSchema } from "@/lib/loans/schemas";
import { previewEligibility } from "@/lib/loans/service";

export const GET = loanRead(async (request, actor) => {
  const query = Object.fromEntries(request.nextUrl.searchParams);
  const input = previewSchema.parse({
    ...query,
    termMonths: Number(query.termMonths),
  });
  return json(await previewEligibility(actor, input));
});
