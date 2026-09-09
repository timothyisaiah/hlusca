import { describe, expect, it } from "vitest";
import {
  allocateDividends,
  averageBalanceBasis,
  dateNumber,
  minorUnits,
  type DividendBasis,
} from "./calculation";
import { dividendRunSchema } from "./schemas";

const basis = (memberId: string, balanceDaysMinor: string): DividendBasis => ({
  memberId,
  savingsAccountId: `account-${memberId}`,
  memberNumber: memberId,
  memberName: memberId,
  balanceDaysMinor,
});

describe("average daily savings dividends", () => {
  it("weights opening balances, midyear deposits and withdrawals, including zero days", () => {
    expect(
      averageBalanceBasis(
        [
          { date: "2024-12-01", delta: "100.00" },
          { date: "2025-07-01", delta: "100.00" },
          { date: "2025-12-31", delta: "-50.00" },
        ],
        "2025-01-01",
        "2025-12-31",
      ),
    ).toBe(String(10000 * 365 + 10000 * 184 - 5000));
    expect(
      averageBalanceBasis(
        [
          { date: "2025-12-31", delta: "100.00" },
          { date: "2026-01-01", delta: "99999.00" },
        ],
        "2025-01-01",
        "2025-12-31",
      ),
    ).toBe("10000");
  });
  it("sums same-day activity before taking the daily close", () => {
    expect(
      averageBalanceBasis(
        [
          { date: "2025-01-01", delta: "-50" },
          { date: "2025-01-01", delta: "100" },
        ],
        "2025-01-01",
        "2025-12-31",
      ),
    ).toBe(String(5000 * 365));
    expect(() =>
      averageBalanceBasis(
        [
          { date: "2025-01-01", delta: "-50" },
          { date: "2025-01-02", delta: "100" },
        ],
        "2025-01-01",
        "2025-12-31",
      ),
    ).toThrow(/negative daily/);
  });
  it("includes leap days and uses the full-year divisor for a new member", () => {
    const days = dateNumber("2024-12-31") - dateNumber("2024-01-01") + 1;
    expect(days).toBe(366);
    const value = averageBalanceBasis(
      [{ date: "2024-02-29", delta: "366" }],
      "2024-01-01",
      "2024-12-31",
    );
    expect(
      allocateDividends([basis("a", value)], "100", days)[0].averageBalance,
    ).toBe("307.00");
  });
  it("allocates exact proportions and resolves cent ties deterministically", () => {
    const rows = allocateDividends(
      [
        basis("c", "36500"),
        basis("b", "36500"),
        basis("a", "36500"),
        basis("zero", "0"),
      ],
      "0.02",
      365,
    );
    expect(rows.map((row) => [row.memberId, row.amount])).toEqual([
      ["a", "0.01"],
      ["b", "0.01"],
      ["c", "0.00"],
    ]);
    expect(
      allocateDividends(
        [basis("a", "36500"), basis("b", "73000")],
        "10",
        365,
      ).map((row) => row.amount),
    ).toEqual(["3.33", "6.67"]);
  });
  it("preserves every cent for large pools and precise balance weights", () => {
    const rows = allocateDividends(
      Array.from({ length: 127 }, (_, i) =>
        basis(String(i), String(BigInt(i + 1) * BigInt("999999999999999999"))),
      ),
      "999999999999.99",
      366,
    );
    expect(
      rows.reduce((sum, row) => sum + minorUnits(row.amount), BigInt("0")),
    ).toBe(BigInt("99999999999999"));
  });
  it("rejects empty pools, malformed dates, negative weights, and duplicate recipients", () => {
    expect(() => allocateDividends([basis("a", "0")], "10", 365)).toThrow();
    expect(() => allocateDividends([basis("a", "1")], "0", 365)).toThrow();
    expect(() => allocateDividends([basis("a", "-1")], "10", 365)).toThrow();
    expect(() =>
      allocateDividends([basis("a", "1"), basis("a", "2")], "10", 365),
    ).toThrow();
    expect(() => dateNumber("2025-02-29")).toThrow();
  });
  it("validates calendar and non-calendar financial years", () => {
    const input = {
      financialYear: 2025,
      periodStart: "2024-07-01",
      periodEnd: "2025-06-30",
      totalPoolAmount: "100",
    };
    expect(dividendRunSchema.safeParse(input).success).toBe(true);
    expect(
      dividendRunSchema.safeParse({
        ...input,
        periodStart: "2024-02-29",
        periodEnd: "2025-02-27",
      }).success,
    ).toBe(true);
    expect(
      dividendRunSchema.safeParse({ ...input, periodStart: "not-a-date" })
        .success,
    ).toBe(false);
    expect(
      dividendRunSchema.safeParse({ ...input, financialYear: 2024 }).success,
    ).toBe(false);
    expect(
      dividendRunSchema.safeParse({ ...input, periodEnd: "2025-06-29" })
        .success,
    ).toBe(false);
    expect(
      dividendRunSchema.safeParse({ ...input, totalPoolAmount: "1.001" })
        .success,
    ).toBe(false);
    expect(
      dividendRunSchema.safeParse({
        ...input,
        calculationMethod: "POINT_IN_TIME",
      }).success,
    ).toBe(false);
  });
});
