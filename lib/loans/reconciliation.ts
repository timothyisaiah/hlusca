import { Prisma } from "@prisma/client";
import { ApiError } from "../api";

const Decimal = Prisma.Decimal;
type Money = string | Prisma.Decimal;
export type ReconciliationSchedule = {
  id: string;
  installmentNumber: number;
  dueDate: Date | string;
  principalDue: Money;
  interestDue: Money;
  status?: string;
};
export type ReconciliationPayment = {
  id: string;
  amount: Money;
  paymentDate: Date | string;
  createdAt: Date | string;
  targetInstallmentNumber: number | null;
};

export const dateOnly = (value: Date | string) =>
  (value instanceof Date ? value.toISOString() : value).slice(0, 10);

/** Business dates are Kampala dates; database DATE values are already date-only. */
export function businessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Kampala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function comparePayments(
  a: ReconciliationPayment,
  b: ReconciliationPayment,
) {
  return (
    dateOnly(a.paymentDate).localeCompare(dateOnly(b.paymentDate)) ||
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
    a.id.localeCompare(b.id)
  );
}

/** INST-3/receipt-123 targets installment 3. A selector may also supply the target. */
export function paymentTarget(reference: string, selected?: number) {
  const match = /^INST-(\d+)(?:\/|$)/i.exec(reference);
  if (/^INST-/i.test(reference) && !match)
    throw new ApiError(
      "Use INST-<number>/<receipt> for an installment reference.",
    );
  const indicated = match ? Number(match[1]) : undefined;
  if (
    indicated !== undefined &&
    (!Number.isSafeInteger(indicated) || indicated < 1 || indicated > 360)
  )
    throw new ApiError("The installment reference must be between 1 and 360.");
  if (selected && indicated && selected !== indicated)
    throw new ApiError(
      "The selected installment and payment reference disagree.",
    );
  return selected ?? indicated ?? null;
}

/** Replaying receipts makes backdated matching deterministic. Interest is paid first
 * within each row; any remainder visits the other installments in due-date order. */
export function reconcilePayments(
  input: ReconciliationSchedule[],
  payments: ReconciliationPayment[],
  today: string,
) {
  if (input.some((row) => row.status === "WAIVED"))
    throw new ApiError(
      "This loan has a waived installment and requires a supported adjustment workflow.",
      409,
    );
  const rows = [...input]
    .sort(
      (a, b) =>
        dateOnly(a.dueDate).localeCompare(dateOnly(b.dueDate)) ||
        a.installmentNumber - b.installmentNumber,
    )
    .map((row) => ({
      ...row,
      principalPaid: new Decimal(0),
      interestPaid: new Decimal(0),
    }));
  const allocations: {
    paymentId: string;
    scheduleId: string;
    principalAmount: string;
    interestAmount: string;
  }[] = [];
  for (const payment of [...payments].sort(comparePayments)) {
    let remaining = new Decimal(payment.amount);
    if (
      !remaining.isFinite() ||
      remaining.lte(0) ||
      remaining.decimalPlaces() > 2
    )
      throw new ApiError(
        "Payment must be a positive amount with at most two decimal places.",
      );
    const target =
      payment.targetInstallmentNumber === null
        ? undefined
        : rows.find(
            (row) => row.installmentNumber === payment.targetInstallmentNumber,
          );
    if (payment.targetInstallmentNumber !== null && !target)
      throw new ApiError("The selected installment does not exist.");
    for (const row of target
      ? [target, ...rows.filter((r) => r !== target)]
      : rows) {
      if (remaining.isZero()) break;
      const interest = Decimal.min(
        remaining,
        new Decimal(row.interestDue).minus(row.interestPaid),
      );
      remaining = remaining.minus(interest);
      const principal = Decimal.min(
        remaining,
        new Decimal(row.principalDue).minus(row.principalPaid),
      );
      remaining = remaining.minus(principal);
      if (interest.plus(principal).isZero()) continue;
      row.interestPaid = row.interestPaid.plus(interest);
      row.principalPaid = row.principalPaid.plus(principal);
      allocations.push({
        paymentId: payment.id,
        scheduleId: row.id,
        principalAmount: principal.toFixed(2),
        interestAmount: interest.toFixed(2),
      });
    }
    if (remaining.gt(0))
      throw new ApiError(
        "Payment exceeds the loan's remaining scheduled balance.",
        409,
      );
  }
  let outstanding = new Decimal(0);
  const schedule = rows.map((row) => {
    const remaining = new Decimal(row.principalDue)
      .plus(row.interestDue)
      .minus(row.principalPaid)
      .minus(row.interestPaid);
    outstanding = outstanding.plus(remaining);
    const status = remaining.isZero()
      ? "PAID"
      : dateOnly(row.dueDate) < today
        ? "OVERDUE"
        : row.principalPaid.plus(row.interestPaid).gt(0)
          ? "PARTIAL"
          : "PENDING";
    return {
      id: row.id,
      principalPaid: row.principalPaid.toFixed(2),
      interestPaid: row.interestPaid.toFixed(2),
      remainingDue: remaining.toFixed(2),
      status,
    };
  });
  return { schedule, allocations, outstandingBalance: outstanding.toFixed(2) };
}
