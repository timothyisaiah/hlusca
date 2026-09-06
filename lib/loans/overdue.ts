import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ApiError } from "../api";
import { snapshot } from "./service";

export function authorizeOverdueJob(
  header: string | null,
  secret: string | undefined,
) {
  if (!secret || secret.length < 32)
    throw new ApiError("The overdue job is not configured.", 503);
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(header ?? "");
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    throw new ApiError("Unauthorized.", 401);
}

export async function flagOverdueInstallments(
  tx: Prisma.TransactionClient,
  today: string,
) {
  const cutoff = new Date(`${today}T00:00:00Z`);
  // SKIP LOCKED lets concurrent invocations/repayments proceed without deadlocks.
  // Skipped loans are checked on the next invocation. Paid/closed loans stay paid.
  const loans = await tx.$queryRaw<{ id: string }[]>`
    SELECT l.id FROM hlusca."Loan" l
    WHERE l.status IN ('ACTIVE', 'DEFAULTED') AND EXISTS (
      SELECT 1 FROM hlusca."LoanSchedule" s WHERE s."loanId" = l.id
      AND s.status IN ('PENDING', 'PARTIAL') AND s."dueDate" < ${cutoff}
      AND s."totalDue" > s."principalPaid" + s."interestPaid"
    ) ORDER BY l.id FOR UPDATE OF l SKIP LOCKED
  `;
  const ids = loans.map((loan) => loan.id);
  const where: Prisma.LoanScheduleWhereInput = {
    loanId: { in: ids },
    dueDate: { lt: cutoff },
    status: { in: ["PENDING", "PARTIAL"] },
  };
  const before = ids.length
    ? await tx.loanSchedule.findMany({
        where,
        orderBy: [{ loanId: "asc" }, { installmentNumber: "asc" }],
      })
    : [];
  const eligible = before.filter((row) =>
    row.totalDue.gt(row.principalPaid.plus(row.interestPaid)),
  );
  if (eligible.length)
    await tx.loanSchedule.updateMany({
      where: { id: { in: eligible.map((row) => row.id) } },
      data: { status: "OVERDUE" },
    });
  return {
    result: { date: today, updated: eligible.length },
    beforeState: snapshot({ date: today, schedule: eligible }),
    afterState: snapshot({
      date: today,
      schedule: eligible.map((row) => ({ ...row, status: "OVERDUE" })),
    }),
  };
}
