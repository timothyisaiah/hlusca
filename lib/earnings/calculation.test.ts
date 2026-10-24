import { describe, expect, it } from "vitest";

import { dateNumber } from "@/lib/investments/calculation";
import {
  allocateEarnings,
  attributeCollectedInterest,
  dailyInterestSchedule,
  dailyMinimumBalances,
  dayString,
  memberPoolMinor,
  type EarningsAccount,
} from "@/lib/earnings/calculation";

const cents = (value: number) => BigInt(Math.round(value * 100));
const day = (date: string) => dateNumber(date);

function sum(values: bigint[]) {
  return values.reduce((total, value) => total + value, BigInt(0));
}

describe("dailyInterestSchedule", () => {
  it("spreads each installment over the days before its due date", () => {
    const schedule = dailyInterestSchedule("2026-03-01", [
      { dueDate: "2026-04-01", interestMinor: cents(31_000) },
      { dueDate: "2026-05-01", interestMinor: cents(15_000) },
    ]);

    expect(schedule).toHaveLength(61);
    expect(dayString(schedule[0].day)).toBe("2026-03-01");
    expect(schedule[0].minor).toBe(cents(1_000));
    expect(dayString(schedule[30].day)).toBe("2026-03-31");
    expect(dayString(schedule[31].day)).toBe("2026-04-01");
    expect(schedule[31].minor).toBe(cents(500));
  });

  it("keeps every cent when interest does not divide evenly", () => {
    const schedule = dailyInterestSchedule("2026-02-01", [
      { dueDate: "2026-03-01", interestMinor: BigInt(1_000) },
    ]);

    expect(schedule).toHaveLength(28);
    expect(sum(schedule.map((entry) => entry.minor))).toBe(BigInt(1_000));
    expect(schedule[0].minor).toBe(BigInt(36));
    expect(schedule[27].minor).toBe(BigInt(35));
  });
});

describe("attributeCollectedInterest", () => {
  const schedule = dailyInterestSchedule("2026-03-01", [
    { dueDate: "2026-04-01", interestMinor: cents(31_000) },
    { dueDate: "2026-05-01", interestMinor: cents(30_000) },
  ]);

  it("shares collected interest only for days that have passed", () => {
    // Borrower prepaid both installments' interest; only March has accrued.
    const { delta, days } = attributeCollectedInterest(
      schedule,
      cents(61_000),
      BigInt(0),
      "2026-03-31",
    );

    expect(delta).toBe(cents(31_000));
    expect(days.size).toBe(31);
    expect(days.get(day("2026-03-15"))).toBe(cents(1_000));
    expect(days.has(day("2026-04-01"))).toBe(false);
  });

  it("funds the earliest unfunded days first and never re-shares interest", () => {
    // A late payment covering half of March arrives after nothing was shared.
    const first = attributeCollectedInterest(
      schedule,
      cents(15_500),
      BigInt(0),
      "2026-04-30",
    );
    expect(first.delta).toBe(cents(15_500));
    expect([...first.days.keys()].map(dayString)).toEqual(
      Array.from({ length: 16 }, (_, index) =>
        dayString(day("2026-03-01") + index),
      ).slice(0, 16),
    );
    expect(first.days.get(day("2026-03-16"))).toBe(cents(500));

    // The next run picks up exactly where the last one stopped.
    const second = attributeCollectedInterest(
      schedule,
      cents(31_000),
      first.delta,
      "2026-04-30",
    );
    expect(second.delta).toBe(cents(15_500));
    expect(second.days.get(day("2026-03-16"))).toBe(cents(500));
    expect(second.days.get(day("2026-03-17"))).toBe(cents(1_000));
    expect(second.days.has(day("2026-03-15"))).toBe(false);

    const again = attributeCollectedInterest(
      schedule,
      cents(31_000),
      cents(31_000),
      "2026-04-30",
    );
    expect(again.delta).toBe(BigInt(0));
  });
});

describe("dailyMinimumBalances", () => {
  const minimumOn = dailyMinimumBalances([
    { day: day("2026-03-10"), balanceAfterMinor: cents(1_000_000) },
    { day: day("2026-03-12"), balanceAfterMinor: cents(400_000) },
    { day: day("2026-03-12"), balanceAfterMinor: cents(900_000) },
    { day: day("2026-03-14"), balanceAfterMinor: cents(1_500_000) },
  ]);

  it("does not credit a deposit made during the day", () => {
    expect(minimumOn(day("2026-03-09"))).toBe(BigInt(0));
    expect(minimumOn(day("2026-03-10"))).toBe(BigInt(0));
    expect(minimumOn(day("2026-03-11"))).toBe(cents(1_000_000));
  });

  it("uses the lowest point after an intraday withdrawal", () => {
    expect(minimumOn(day("2026-03-12"))).toBe(cents(400_000));
    expect(minimumOn(day("2026-03-13"))).toBe(cents(900_000));
    expect(minimumOn(day("2026-03-14"))).toBe(cents(900_000));
    expect(minimumOn(day("2026-03-15"))).toBe(cents(1_500_000));
  });
});

describe("allocateEarnings", () => {
  function account(
    memberId: string,
    minimums: Record<string, number>,
  ): EarningsAccount {
    return {
      memberId,
      savingsAccountId: `account-${memberId}`,
      memberNumber: `HLUSCA-${memberId}`,
      memberName: memberId,
      minimumOn: (value) => cents(minimums[dayString(value)] ?? 0),
    };
  }

  it("matches the worked example: income follows that day's lowest balances", () => {
    const income = new Map([
      [day("2026-03-10"), cents(1_000)],
      [day("2026-03-11"), cents(1_000)],
    ]);
    const shares = allocateEarnings(
      income,
      [
        account("A", { "2026-03-10": 1_000_000, "2026-03-11": 1_000_000 }),
        // B deposited at 2 pm on the 10th, so earns from the 11th.
        account("B", { "2026-03-10": 0, "2026-03-11": 1_000_000 }),
      ],
      cents(2_000),
    );

    expect(shares).toEqual([
      expect.objectContaining({ memberId: "A", amount: "1500.00", earningDays: 2 }),
      expect.objectContaining({ memberId: "B", amount: "500.00", earningDays: 1 }),
    ]);
  });

  it("distributes every cent of the pool", () => {
    const income = new Map([[day("2026-03-10"), BigInt(1_000)]]);
    const shares = allocateEarnings(
      income,
      [
        account("A", { "2026-03-10": 1 }),
        account("B", { "2026-03-10": 1 }),
        account("C", { "2026-03-10": 1 }),
      ],
      BigInt(1_000),
    );
    const total = sum(shares.map((share) => cents(Number(share.amount))));

    expect(total).toBe(BigInt(1_000));
    expect(shares.map((share) => share.amount)).toEqual(["3.34", "3.33", "3.33"]);
  });

  it("leaves members without savings out", () => {
    const shares = allocateEarnings(
      new Map([[day("2026-03-10"), cents(100)]]),
      [account("A", { "2026-03-10": 50 }), account("Z", {})],
      cents(100),
    );

    expect(shares.map((share) => share.memberId)).toEqual(["A"]);
  });
});

describe("memberPoolMinor", () => {
  it("rounds the member share down to the cent", () => {
    expect(memberPoolMinor(BigInt(1_001), "70")).toBe(BigInt(700));
    expect(memberPoolMinor(cents(10_000), "70.5")).toBe(cents(7_050));
  });

  it("rejects an out-of-range share", () => {
    expect(() => memberPoolMinor(BigInt(100), "101")).toThrow();
  });
});
