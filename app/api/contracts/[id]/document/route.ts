import { loanRead } from "@/lib/loans/routes";
import { getContractFile } from "@/lib/loans/service";

export const GET = loanRead(
  async (_request, actor, id) =>
    new Response(new Uint8Array(await getContractFile(id, actor)), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="HLUSCA-loan-contract.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    }),
);
