import { Prisma } from "@prisma/client";
import { ApiError } from "../api";
import { prisma } from "../db";
import { businessDate, dateOnly } from "./reconciliation";
import type { LoanActor } from "./service";
import type { LoanStatement, LoanStatementRow } from "./statement-types";

export async function getLoanStatement(
  loanId: string,
  actor: LoanActor,
  tx?: Prisma.TransactionClient,
): Promise<LoanStatement> {
  if (!tx)
    return prisma.$transaction((db) => getLoanStatement(loanId, actor, db));
  // A shared lock yields a consistent ledger/schedule while repayments and cron
  // acquire exclusive locks on the same loan. Apply ownership to the lock too.
  const owned =
    actor.role === "CLIENT"
      ? Prisma.sql`AND "memberId" = ${actor.memberId ?? ""}`
      : Prisma.empty;
  const locked = await tx.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT id FROM hlusca."Loan" WHERE id = ${loanId} ${owned} FOR SHARE`,
  );
  if (!locked.length) throw new ApiError("Loan not found.", 404);
  const loan = await tx.loan.findUniqueOrThrow({
    where: { id: loanId },
    include: {
      member: {
        select: { memberNumber: true, firstName: true, lastName: true },
      },
      application: { select: { loanTypeName: true } },
      schedule: { orderBy: { installmentNumber: "asc" } },
      payments: {
        orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        include: {
          allocations: {
            include: { schedule: { select: { installmentNumber: true } } },
          },
        },
      },
    },
  });
  const totalInterest = loan.schedule.reduce(
    (sum, row) => sum.plus(row.interestDue),
    new Prisma.Decimal(0),
  );
  const totalRepayable = loan.principal.plus(totalInterest);
  let balance = totalRepayable;
  const rows: LoanStatementRow[] = [
    {
      id: loan.id,
      date: businessDate(loan.disbursementDate),
      type: "DISBURSEMENT",
      reference: `LOAN-${loan.loanApplicationId}`,
      method: null,
      principal: loan.principal.toFixed(2),
      interest: totalInterest.toFixed(2),
      amount: totalRepayable.toFixed(2),
      balance: balance.toFixed(2),
      allocations: [],
    },
  ];
  for (const payment of loan.payments) {
    balance = balance.minus(payment.amount);
    const principal = payment.allocations.reduce(
      (sum, row) => sum.plus(row.principalAmount),
      new Prisma.Decimal(0),
    );
    const interest = payment.allocations.reduce(
      (sum, row) => sum.plus(row.interestAmount),
      new Prisma.Decimal(0),
    );
    rows.push({
      id: payment.id,
      date: dateOnly(payment.paymentDate),
      type: "PAYMENT",
      reference: payment.reference,
      method: payment.method,
      amount: payment.amount.toFixed(2),
      principal: principal.toFixed(2),
      interest: interest.toFixed(2),
      balance: balance.toFixed(2),
      allocations: payment.allocations
        .map((a) => ({
          installmentNumber: a.schedule.installmentNumber,
          principal: a.principalAmount.toFixed(2),
          interest: a.interestAmount.toFixed(2),
        }))
        .sort((a, b) => a.installmentNumber - b.installmentNumber),
    });
  }
  return {
    loanId: loan.id,
    applicationId: loan.loanApplicationId,
    memberNumber: loan.member.memberNumber,
    memberName: `${loan.member.firstName} ${loan.member.lastName}`,
    loanTypeName: loan.application.loanTypeName,
    status: loan.status,
    disbursementDate: businessDate(loan.disbursementDate),
    today: businessDate(),
    principal: loan.principal.toFixed(2),
    totalInterest: totalInterest.toFixed(2),
    totalRepayable: totalRepayable.toFixed(2),
    totalPaid: totalRepayable.minus(balance).toFixed(2),
    outstandingBalance: loan.outstandingBalance.toFixed(2),
    rows,
    schedule: loan.schedule.map((row) => ({
      id: row.id,
      installmentNumber: row.installmentNumber,
      dueDate: dateOnly(row.dueDate),
      principalDue: row.principalDue.toFixed(2),
      interestDue: row.interestDue.toFixed(2),
      totalDue: row.totalDue.toFixed(2),
      principalPaid: row.principalPaid.toFixed(2),
      interestPaid: row.interestPaid.toFixed(2),
      totalPaid: row.principalPaid.plus(row.interestPaid).toFixed(2),
      remainingDue: row.totalDue
        .minus(row.principalPaid)
        .minus(row.interestPaid)
        .toFixed(2),
      status: row.status,
    })),
  };
}
