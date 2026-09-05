import { loanRead } from "@/lib/loans/routes";
import { getContractFile } from "@/lib/loans/service";

export const GET = loanRead(
  async (_request, actor, id) =>
    new Response(new Uint8Array(await getContractFile(id, actor, true)), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    }),
);
