import { Prisma, type InterestMethod } from "@prisma/client";

const D = Prisma.Decimal;
const cents = (value: Prisma.Decimal) =>
  value.toDecimalPlaces(2, D.ROUND_HALF_UP);

export interface ScheduleInstallment {
  installmentNumber: number;
  dueDate: string;
  principalDue: string;
  interestDue: string;
  totalDue: string;
  principalBalanceAfter: string;
}

export function monthlyDueDate(origin: Date, month: number) {
  const year = origin.getUTCFullYear();
  const targetMonth = origin.getUTCMonth() + month;
  const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(year, targetMonth, Math.min(origin.getUTCDate(), lastDay)),
  );
}

/** Rates are annual percentages. Monthly installments use exact decimal arithmetic. */
export function generateSchedule(input: {
  principal: string;
  interestRate: string;
  interestMethod: InterestMethod;
  termMonths: number;
  disbursementDate: Date;
}): ScheduleInstallment[] {
  const principal = new D(input.principal);
  const annualRate = new D(input.interestRate);
  const n = input.termMonths;
  if (
    !principal.isFinite() ||
    principal.lte(0) ||
    principal.gt("999999999999.99") ||
    principal.decimalPlaces() > 2 ||
    !annualRate.isFinite() ||
    annualRate.lt(0) ||
    annualRate.gt(100) ||
    !Number.isInteger(n) ||
    n < 1 ||
    n > 360 ||
    !Number.isFinite(input.disbursementDate.getTime()) ||
    !["FLAT", "REDUCING_BALANCE"].includes(input.interestMethod)
  ) {
    throw new Error("Invalid loan schedule terms.");
  }
  const monthlyRate = annualRate.div(1200);
  const flatInterest = cents(principal.mul(monthlyRate).mul(n));
  const payment = monthlyRate.isZero()
    ? cents(principal.div(n))
    : cents(
        principal
          .mul(monthlyRate)
          .div(new D(1).minus(new D(1).plus(monthlyRate).pow(-n))),
      );
  let balance = principal;
  let interestAllocated = new D(0);
  const rows: ScheduleInstallment[] = [];
  for (let index = 1; index <= n; index++) {
    const final = index === n;
    const interest =
      input.interestMethod === "FLAT"
        ? final
          ? flatInterest.minus(interestAllocated)
          : D.min(
              cents(flatInterest.div(n)),
              flatInterest.minus(interestAllocated),
            )
        : cents(balance.mul(monthlyRate));
    const principalPart = final
      ? balance
      : D.min(
          balance,
          D.max(
            0,
            input.interestMethod === "FLAT"
              ? cents(principal.div(n))
              : payment.minus(interest),
          ),
        );
    balance = balance.minus(principalPart);
    interestAllocated = interestAllocated.plus(interest);
    rows.push({
      installmentNumber: index,
      dueDate: monthlyDueDate(input.disbursementDate, index)
        .toISOString()
        .slice(0, 10),
      principalDue: principalPart.toFixed(2),
      interestDue: interest.toFixed(2),
      totalDue: principalPart.plus(interest).toFixed(2),
      principalBalanceAfter: balance.toFixed(2),
    });
  }
  return rows;
}

export function loanQuote(
  input: Parameters<typeof generateSchedule>[0] & {
    processingFeePercent: string;
  },
) {
  const schedule = generateSchedule(input);
  const processingFee = cents(
    new D(input.principal).mul(input.processingFeePercent).div(100),
  );
  return {
    schedule,
    processingFee: processingFee.toFixed(2),
    netDisbursement: new D(input.principal).minus(processingFee).toFixed(2),
    totalInterest: schedule
      .reduce((sum, row) => sum.plus(row.interestDue), new D(0))
      .toFixed(2),
    totalRepayable: schedule
      .reduce((sum, row) => sum.plus(row.totalDue), new D(0))
      .toFixed(2),
  };
}
