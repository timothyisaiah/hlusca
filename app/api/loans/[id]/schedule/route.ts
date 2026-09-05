import { json } from "@/lib/api";
import { loanRead } from "@/lib/loans/routes";
import { getLoanSchedule } from "@/lib/loans/service";

export const GET = loanRead(async (_request, actor, id) =>
  json(await getLoanSchedule(id, actor)),
);
