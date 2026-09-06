import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  businessDate,
  paymentTarget,
  reconcilePayments,
  type ReconciliationPayment,
} from "./reconciliation";
import { generateSchedule } from "./schedule";
import { paymentSchema } from "./schemas";

const rows = [1, 2, 3].map((n) => ({
  id: `s${n}`,
  installmentNumber: n,
  dueDate: `2026-0${n + 1}-01`,
  principalDue: "100.00",
  interestDue: "10.00",
}));
function payment(
  amount: string,
  id = "p1",
  targetInstallmentNumber: number | null = null,
): ReconciliationPayment {
  return {
    id,
    amount,
    targetInstallmentNumber,
    paymentDate: "2026-01-01",
    createdAt: `2026-01-01T12:00:0${id.slice(-1)}Z`,
  };
}
describe("loan payment reconciliation", () => {
  it("matches interest first, tracks partial principal and preserves every cent", () => {
    const result = reconcilePayments(rows, [payment("25.01")], "2026-01-01");
    expect(result.allocations).toEqual([
      {
        paymentId: "p1",
        scheduleId: "s1",
        principalAmount: "15.01",
        interestAmount: "10.00",
      },
    ]);
    expect(result.schedule[0]).toMatchObject({
      principalPaid: "15.01",
      interestPaid: "10.00",
      remainingDue: "84.99",
      status: "PARTIAL",
    });
    expect(result.outstandingBalance).toBe("304.99");
  });
  it("rolls over excess into following installments and closes the final cent", () => {
    const result = reconcilePayments(
      [...rows].reverse(),
      [payment("225.00")],
      "2026-01-01",
    );
    expect(result.schedule.map((row) => row.status)).toEqual([
      "PAID",
      "PAID",
      "PARTIAL",
    ]);
    expect(result.allocations.at(-1)).toMatchObject({
      scheduleId: "s3",
      principalAmount: "0.00",
      interestAmount: "5.00",
    });
    const closed = reconcilePayments(
      rows,
      [payment("329.99"), payment("0.01", "p2")],
      "2026-01-01",
    );
    expect(closed.outstandingBalance).toBe("0.00");
    expect(closed.schedule.every((row) => row.status === "PAID")).toBe(true);
  });
  it("targets the indicated installment then returns to remaining FIFO debt", () => {
    const result = reconcilePayments(
      rows,
      [payment("120", "p1", 3)],
      "2026-01-01",
    );
    expect(result.allocations.map((a) => a.scheduleId)).toEqual(["s3", "s1"]);
    expect(result.schedule.map((row) => row.status)).toEqual([
      "PARTIAL",
      "PENDING",
      "PAID",
    ]);
    expect(() =>
      reconcilePayments(rows, [payment("10", "p1", 4)], "2026-01-01"),
    ).toThrow("does not exist");
  });
  it("replays backdated receipts in date order independent of input order", () => {
    const late = { ...payment("100", "p1"), paymentDate: "2026-01-20" };
    const early = { ...payment("20", "p2"), paymentDate: "2026-01-05" };
    const result = reconcilePayments(rows, [late, early], "2026-01-30");
    expect(result).toEqual(
      reconcilePayments(rows, [early, late], "2026-01-30"),
    );
    expect(result.allocations[0]).toMatchObject({
      paymentId: "p2",
      interestAmount: "10.00",
      principalAmount: "10.00",
    });
    expect(result.allocations.filter((a) => a.paymentId === "p1")).toEqual([
      {
        paymentId: "p1",
        scheduleId: "s1",
        principalAmount: "90.00",
        interestAmount: "0.00",
      },
      {
        paymentId: "p1",
        scheduleId: "s2",
        principalAmount: "0.00",
        interestAmount: "10.00",
      },
    ]);
  });
  it("keeps unpaid past-due rows overdue but never flags a row due today", () => {
    const result = reconcilePayments(rows, [payment("5")], "2026-03-01");
    expect(result.schedule.map((row) => row.status)).toEqual([
      "OVERDUE",
      "PENDING",
      "PENDING",
    ]);
    expect(result.schedule[0].remainingDue).toBe("105.00");
  });
  it("rejects surplus, invalid amounts, and unsupported waived schedules", () => {
    for (const amount of ["330.01", "0", "-1", "0.001", "NaN"])
      expect(() =>
        reconcilePayments(rows, [payment(amount)], "2026-01-01"),
      ).toThrow();
    expect(() =>
      reconcilePayments([{ ...rows[0], status: "WAIVED" }], [], "2026-01-01"),
    ).toThrow("waived");
  });
  it("handles zero-interest and zero-value rounded installments without phantom balances", () => {
    const result = reconcilePayments(
      [
        { ...rows[0], principalDue: "0.00", interestDue: "0.00" },
        { ...rows[1], principalDue: "0.01", interestDue: "0.00" },
      ],
      [],
      "2026-01-01",
    );
    expect(result.schedule[0].status).toBe("PAID");
    expect(result.outstandingBalance).toBe("0.01");
  });
  it.each(["FLAT", "REDUCING_BALANCE"] as const)(
    "conserves scheduled principal and interest for %s through full repayment",
    (interestMethod) => {
      const schedule = generateSchedule({
        principal: "123456.78",
        interestRate: "17.25",
        interestMethod,
        termMonths: 36,
        disbursementDate: new Date("2026-01-31T00:00:00Z"),
      });
      const total = schedule.reduce(
        (sum, row) => sum.plus(row.totalDue),
        new Prisma.Decimal(0),
      );
      const result = reconcilePayments(
        schedule.map((row) => ({ ...row, id: `s${row.installmentNumber}` })),
        [payment("0.01"), payment(total.minus("0.01").toFixed(2), "p2")],
        "2026-01-31",
      );
      expect(result.outstandingBalance).toBe("0.00");
      expect(
        result.allocations
          .reduce(
            (sum, a) => sum.plus(a.principalAmount),
            new Prisma.Decimal(0),
          )
          .toFixed(2),
      ).toBe("123456.78");
    },
  );
  it("parses unambiguous installment references and rejects conflicting selections", () => {
    expect(paymentTarget("INST-3/ABC123")).toBe(3);
    expect(paymentTarget("BANK-123", 2)).toBe(2);
    expect(paymentTarget("BANK-123")).toBe(null);
    for (const reference of ["INST-0", "INST-361", "INST-3-ABC", "INST-X"])
      expect(() => paymentTarget(reference)).toThrow();
    expect(() => paymentTarget("INST-3/ABC", 2)).toThrow("disagree");
  });
  it("normalizes references, requires confirmation and checks real calendar dates", () => {
    const input = {
      amount: "10.01",
      paymentDate: "2026-02-28",
      method: "CASH",
      reference: " receipt-1 ",
      confirm: true,
    };
    expect(paymentSchema.parse(input).reference).toBe("RECEIPT-1");
    expect(
      paymentSchema.safeParse({ ...input, paymentDate: "2026-02-30" }).success,
    ).toBe(false);
    expect(paymentSchema.safeParse({ ...input, confirm: false }).success).toBe(
      false,
    );
    expect(paymentSchema.safeParse({ ...input, amount: 10.01 }).success).toBe(
      false,
    );
  });
  it("uses the Kampala calendar boundary", () => {
    expect(businessDate(new Date("2026-09-06T20:59:59Z"))).toBe("2026-09-06");
    expect(businessDate(new Date("2026-09-06T21:00:00Z"))).toBe("2026-09-07");
  });
});
