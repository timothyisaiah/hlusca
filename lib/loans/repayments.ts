import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { ApiError } from "../api";
import {
  businessDate,
  paymentTarget,
  reconcilePayments,
} from "./reconciliation";
import type { paymentSchema } from "./schemas";
import { assertLoanRole, snapshot, type LoanActor } from "./service";

export async function recordLoanPayment(
  tx: Prisma.TransactionClient,
  actor: LoanActor,
  loanId: string,
  input: z.infer<typeof paymentSchema>,
) {
  assertLoanRole(actor, ["TREASURER"]);
  // Every writer (including the overdue job) locks Loan before touching its schedule.
  await tx.$queryRaw`SELECT id FROM hlusca."Loan" WHERE id = ${loanId} FOR UPDATE`;
  const loan = await tx.loan.findUnique({
    where: { id: loanId },
    include: {
      schedule: { orderBy: { installmentNumber: "asc" } },
      payments: {
        include: { allocations: true },
        orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      },
    },
  });
  if (!loan) throw new ApiError("Loan not found.", 404);
  if (actor.memberId === loan.memberId)
    throw new ApiError(
      "Another Treasurer must record payments on your loan.",
      403,
    );
  if (loan.status === "CLOSED")
    throw new ApiError("This loan is already closed.", 409);
  const today = businessDate();
  if (
    input.paymentDate > today ||
    input.paymentDate < businessDate(loan.disbursementDate)
  )
    throw new ApiError(
      "Payment date must be between disbursement and today (Kampala time).",
    );
  if (loan.payments.some((payment) => payment.reference === input.reference))
    throw new ApiError(
      "This receipt reference has already been recorded for this loan.",
      409,
    );
  if (new Prisma.Decimal(input.amount).gt(loan.outstandingBalance))
    throw new ApiError(
      "Payment exceeds the loan's remaining scheduled balance.",
      409,
    );
  const targetInstallmentNumber = paymentTarget(
    input.reference,
    input.targetInstallmentNumber,
  );
  const payment = await tx.loanPayment.create({
    data: {
      loanId,
      amount: input.amount,
      paymentDate: new Date(`${input.paymentDate}T00:00:00Z`),
      method: input.method,
      reference: input.reference,
      targetInstallmentNumber,
      recordedById: actor.id,
    },
  });
  const matched = reconcilePayments(
    loan.schedule,
    [...loan.payments, payment],
    today,
  );
  await tx.loanPaymentAllocation.deleteMany({ where: { loanId } });
  await tx.loanPaymentAllocation.createMany({
    data: matched.allocations.map((allocation) => ({ ...allocation, loanId })),
  });
  // One round trip for up to 360 installments, keeping the financial lock short.
  await tx.$executeRaw(Prisma.sql`
    UPDATE hlusca."LoanSchedule" AS s SET
      "principalPaid" = v.principal, "interestPaid" = v.interest, status = v.status
    FROM (VALUES ${Prisma.join(matched.schedule.map((row) => Prisma.sql`(${row.id}, ${row.principalPaid}::numeric, ${row.interestPaid}::numeric, ${row.status}::hlusca."LoanScheduleStatus")`))})
      AS v(id, principal, interest, status)
    WHERE s.id = v.id AND s."loanId" = ${loanId}
  `);
  const updated = await tx.loan.update({
    where: { id: loanId },
    data: {
      outstandingBalance: matched.outstandingBalance,
      status: new Prisma.Decimal(matched.outstandingBalance).isZero()
        ? "CLOSED"
        : loan.status,
    },
  });
  const memberUser = await tx.user.findUnique({
    where: { memberId: loan.memberId },
    select: { id: true },
  });
  if (memberUser)
    await tx.notification.create({
      data: {
        userId: memberUser.id,
        type: "SYSTEM",
        message: `Loan payment received: UGX ${payment.amount.toFixed(2)} (${payment.reference}). Remaining scheduled balance: UGX ${matched.outstandingBalance}.${updated.status === "CLOSED" ? " Your loan is fully repaid." : ""}`,
      },
    });
  return {
    entityId: payment.id,
    result: {
      payment,
      outstandingBalance: updated.outstandingBalance,
      status: updated.status,
    },
    beforeState: snapshot({
      loanId,
      status: loan.status,
      outstandingBalance: loan.outstandingBalance,
      schedule: loan.schedule,
      payments: loan.payments,
    }),
    afterState: snapshot({
      loanId,
      payment,
      status: updated.status,
      ...matched,
    }),
  };
}
