import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { generateSchedule, loanQuote } from "./schedule";

const defaults = {
  principal: "1200000",
  interestRate: "12",
  termMonths: 12,
  interestMethod: "FLAT" as const,
  disbursementDate: new Date("2026-01-31T15:00:00Z"),
};
const sum = (
  rows: ReturnType<typeof generateSchedule>,
  key: "principalDue" | "interestDue" | "totalDue",
) =>
  rows
    .reduce((value, row) => value.plus(row[key]), new Prisma.Decimal(0))
    .toFixed(2);

describe("monthly loan schedules", () => {
  it("uses annual flat interest over the exact term, with an anchored calendar date", () => {
    const rows = generateSchedule(defaults);
    expect(rows).toHaveLength(12);
    expect(rows[0]).toMatchObject({
      dueDate: "2026-02-28",
      principalDue: "100000.00",
      interestDue: "12000.00",
      totalDue: "112000.00",
    });
    expect(rows[1].dueDate).toBe("2026-03-31");
    expect(sum(rows, "interestDue")).toBe("144000.00");
    expect(rows.at(-1)?.principalBalanceAfter).toBe("0.00");
  });
  it("uses amortized reducing-balance interest and reconciles the final installment", () => {
    const rows = generateSchedule({
      ...defaults,
      principal: "1000000",
      interestMethod: "REDUCING_BALANCE",
    });
    expect(rows[0]).toMatchObject({
      principalDue: "78848.79",
      interestDue: "10000.00",
      totalDue: "88848.79",
    });
    expect(rows[1].interestDue).toBe("9211.51");
    expect(sum(rows, "principalDue")).toBe("1000000.00");
    // Independently verified with Python Decimal, rounding each month's interest.
    expect(sum(rows, "interestDue")).toBe("66185.45");
    expect(rows.at(-1)?.principalBalanceAfter).toBe("0.00");
  });
  it("clamps leap February and crosses year boundaries without date drift", () => {
    const rows = generateSchedule({
      ...defaults,
      disbursementDate: new Date("2027-12-31T00:00:00Z"),
      termMonths: 3,
    });
    expect(rows.map((row) => row.dueDate)).toEqual([
      "2028-01-31",
      "2028-02-29",
      "2028-03-31",
    ]);
  });
  for (const method of ["FLAT", "REDUCING_BALANCE"] as const) {
    it(`handles zero interest and remainder cents for ${method}`, () => {
      const rows = generateSchedule({
        ...defaults,
        principal: "100",
        interestRate: "0",
        termMonths: 3,
        interestMethod: method,
      });
      expect(rows.map((row) => row.principalDue)).toEqual([
        "33.33",
        "33.33",
        "33.34",
      ]);
      expect(sum(rows, "interestDue")).toBe("0.00");
    });
    it(`conserves principal and avoids negative amounts across edge cases for ${method}`, () => {
      for (const principal of ["0.01", "0.07", "123.45", "999999999999.99"]) {
        for (const termMonths of [1, 3, 12, 360]) {
          const rows = generateSchedule({
            ...defaults,
            principal,
            termMonths,
            interestRate: "17.1234",
            interestMethod: method,
          });
          expect(sum(rows, "principalDue")).toBe(principal);
          expect(rows.at(-1)?.principalBalanceAfter).toBe("0.00");
          for (const row of rows) {
            expect(new Prisma.Decimal(row.principalDue).gte(0)).toBe(true);
            expect(new Prisma.Decimal(row.interestDue).gte(0)).toBe(true);
            expect(
              new Prisma.Decimal(row.principalDue)
                .plus(row.interestDue)
                .toFixed(2),
            ).toBe(row.totalDue);
          }
        }
      }
    });
  }
  it("withholds the processing fee while leaving the gross principal repayable", () => {
    const quote = loanQuote({ ...defaults, processingFeePercent: "2.5" });
    expect(quote.processingFee).toBe("30000.00");
    expect(quote.netDisbursement).toBe("1170000.00");
    expect(quote.totalRepayable).toBe("1344000.00");
  });
  it.each([
    { principal: "0" },
    { principal: "1.001" },
    { interestRate: "-1" },
    { termMonths: 0 },
    { termMonths: 361 },
    { termMonths: 1.5 },
  ])("rejects invalid financial terms: %o", (invalid) => {
    expect(() => generateSchedule({ ...defaults, ...invalid })).toThrow(
      "Invalid loan schedule terms",
    );
  });
});
