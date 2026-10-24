import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const verifyPassword = vi.fn();
vi.mock("@/lib/auth/passwords", () => ({ verifyPassword }));

const treasurer = { id: "user-treasurer", role: "TREASURER" as const, memberId: null };
type TestDb = Prisma.TransactionClient;
const D = (value: string) => new Prisma.Decimal(value);

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-24T09:00:00Z"));
});
afterAll(() => vi.useRealTimers());

/**
 * One loan disbursed 1 March: 31,000 interest for March (1,000/day), fully
 * paid; April's 30,000 is unpaid. Member A has held 1,000,000 since February.
 * Member B deposits 1,000,000 at 10:00 on 16 March, so earns from the 17th.
 *
 * Days 1–16: A alone → 16,000. Days 17–31: split evenly → 7,500 each.
 * Pool at 70% = 21,700 → A 21,700 × 23,500/31,000 = 16,450; B = 5,250.
 */
function proposalDb(overrides: { openRun?: object; latestPosted?: string; paid?: string } = {}) {
  const queryRaw = vi
    .fn()
    // Interest already shared per loan (none yet).
    .mockResolvedValueOnce([])
    // Ledger: Kampala dates and running balances.
    .mockResolvedValueOnce([
      { savingsAccountId: "acc-A", date: "2026-02-20", balance: "1000000.00" },
      { savingsAccountId: "acc-B", date: "2026-03-16", balance: "1000000.00" },
    ]);

  return {
    $executeRaw: vi.fn(),
    $queryRaw: queryRaw,
    earningsRun: {
      findFirst: vi.fn(async ({ where }) =>
        where.status === "PROPOSED"
          ? (overrides.openRun ?? null)
          : overrides.latestPosted
            ? { month: overrides.latestPosted }
            : null,
      ),
      create: vi.fn(async ({ data }) => ({ id: "run-1", ...data })),
    },
    systemSetting: { findUnique: vi.fn().mockResolvedValue({ value: "70" }) },
    loan: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "loan-1",
          disbursementDate: new Date("2026-03-01T06:00:00Z"),
          member: { memberNumber: "HLUSCA-000009" },
          schedule: [
            {
              dueDate: new Date("2026-04-01T00:00:00Z"),
              interestDue: D("31000.00"),
              interestPaid: D(overrides.paid ?? "31000.00"),
            },
            {
              dueDate: new Date("2026-05-01T00:00:00Z"),
              interestDue: D("30000.00"),
              interestPaid: D("0.00"),
            },
          ],
        },
      ]),
    },
    savingsAccount: {
      findMany: vi.fn().mockResolvedValue([
        { id: "acc-A", status: "ACTIVE", member: { id: "m-A", memberNumber: "HLUSCA-000001", firstName: "Ann", lastName: "A" } },
        { id: "acc-B", status: "CLOSED", member: { id: "m-B", memberNumber: "HLUSCA-000002", firstName: "Ben", lastName: "B" } },
      ]),
    },
  };
}

describe("proposeEarningsRun", () => {
  it("shares collected interest by each day's lowest balance", async () => {
    const { proposeEarningsRun } = await import("@/lib/earnings/service");
    const db = proposalDb();

    await proposeEarningsRun(db as unknown as TestDb, treasurer, { month: "2026-03" });

    const data = db.earningsRun.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      month: "2026-03",
      interestCollected: "31000.00",
      memberSharePercent: "70",
      memberPool: "21700.00",
      reserveAmount: "9300.00",
      loans: { createMany: { data: [{ loanId: "loan-1", interestRecognized: "31000.00" }] } },
    });
    expect(data.calculationSnapshot.firstDay).toBe("2026-03-01");
    expect(data.calculationSnapshot.lastDay).toBe("2026-03-31");
    expect(data.calculationSnapshot.shares).toEqual([
      expect.objectContaining({ memberId: "m-A", amount: "16450.00", earningDays: 31, accountActive: true }),
      expect.objectContaining({ memberId: "m-B", amount: "5250.00", earningDays: 15, accountActive: false }),
    ]);
  });

  it("only shares interest that has been collected", async () => {
    const { proposeEarningsRun } = await import("@/lib/earnings/service");
    const db = proposalDb({ paid: "0.00" });

    await expect(
      proposeEarningsRun(db as unknown as TestDb, treasurer, { month: "2026-03" }),
    ).rejects.toThrow("No newly collected loan interest");
  });

  it("requires the open proposal to be resolved first", async () => {
    const { proposeEarningsRun } = await import("@/lib/earnings/service");
    const db = proposalDb({ openRun: { month: "2026-02" } });

    await expect(
      proposeEarningsRun(db as unknown as TestDb, treasurer, { month: "2026-03" }),
    ).rejects.toThrow("February 2026 proposal is still open");
  });

  it("keeps months in order", async () => {
    const { proposeEarningsRun } = await import("@/lib/earnings/service");
    const db = proposalDb({ latestPosted: "2026-04" });

    await expect(
      proposeEarningsRun(db as unknown as TestDb, treasurer, { month: "2026-03" }),
    ).rejects.toThrow("already posted");
  });

  it("refuses a month that has not finished", async () => {
    const { proposeEarningsRun } = await import("@/lib/earnings/service");

    await expect(
      proposeEarningsRun(proposalDb() as unknown as TestDb, treasurer, { month: "2026-10" }),
    ).rejects.toThrow("completed month");
  });

  it("is Treasurer-only", async () => {
    const { proposeEarningsRun } = await import("@/lib/earnings/service");

    await expect(
      proposeEarningsRun(
        proposalDb() as unknown as TestDb,
        { id: "u", role: "BOARD", memberId: null },
        { month: "2026-03" },
      ),
    ).rejects.toThrow("Forbidden");
  });
});

describe("postEarningsRun", () => {
  beforeEach(() => verifyPassword.mockReset());

  function postingDb(status = "PROPOSED") {
    const run = {
      id: "run-1",
      month: "2026-03",
      status,
      memberPool: D("21700.00"),
      calculationSnapshot: {
        method: "DAILY_MINIMUM_BALANCE_INTEREST_ATTRIBUTION",
        shares: [
          { memberId: "m-A", savingsAccountId: "acc-A", memberNumber: "1", memberName: "A", earningDays: 31, amount: "16450.00", accountActive: true },
          { memberId: "m-B", savingsAccountId: "acc-B", memberNumber: "2", memberName: "B", earningDays: 15, amount: "5250.00", accountActive: false },
        ],
      },
    };
    return {
      auditLog: { count: vi.fn().mockResolvedValue(0) },
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ passwordHash: "hash" }),
        findMany: vi.fn().mockResolvedValue([{ id: "user-A", memberId: "m-A" }]),
      },
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([]) // run row lock
        .mockResolvedValueOnce([
          { id: "acc-A", memberId: "m-A", balance: D("1000000.00"), status: "ACTIVE" },
          { id: "acc-B", memberId: "m-B", balance: D("1000000.00"), status: "CLOSED" },
        ]),
      $executeRaw: vi.fn(),
      earningsRun: {
        findUnique: vi.fn().mockResolvedValue(run),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(async ({ data }) => ({ ...run, ...data })),
      },
      transaction: { createMany: vi.fn() },
      earningsAllocation: { createMany: vi.fn() },
      notification: { createMany: vi.fn() },
    };
  }

  it("credits active accounts and retains shares of inactive ones", async () => {
    verifyPassword.mockResolvedValue(true);
    const { postEarningsRun } = await import("@/lib/earnings/service");
    const db = postingDb();

    await postEarningsRun(db as unknown as TestDb, treasurer, "run-1", {
      password: "secret",
      confirm: true,
    });

    const transactions = db.transaction.createMany.mock.calls[0][0].data;
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      savingsAccountId: "acc-A",
      type: "INTEREST",
      amount: "16450.00",
      reference: "ERN-2026-03",
      narrative: "Loan interest earnings for March 2026",
    });
    expect(transactions[0].balanceAfter.toFixed(2)).toBe("1016450.00");

    const allocations = db.earningsAllocation.createMany.mock.calls[0][0].data;
    expect(allocations).toEqual([
      expect.objectContaining({ memberId: "m-A", amount: "16450.00", transactionId: transactions[0].id }),
      expect.objectContaining({ memberId: "m-B", forfeited: true }),
    ]);
    expect(db.earningsRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: expect.objectContaining({ status: "POSTED", forfeitedAmount: "5250.00" }),
    });
    expect(db.notification.createMany).toHaveBeenCalledOnce();
  });

  it("requires password confirmation", async () => {
    verifyPassword.mockResolvedValue(false);
    const { postEarningsRun } = await import("@/lib/earnings/service");
    const db = postingDb();

    await expect(
      postEarningsRun(db as unknown as TestDb, treasurer, "run-1", { password: "x", confirm: true }),
    ).rejects.toThrow("Password confirmation failed");
    expect(db.transaction.createMany).not.toHaveBeenCalled();
  });

  it("cannot post twice", async () => {
    verifyPassword.mockResolvedValue(true);
    const { postEarningsRun } = await import("@/lib/earnings/service");

    await expect(
      postEarningsRun(postingDb("POSTED") as unknown as TestDb, treasurer, "run-1", {
        password: "secret",
        confirm: true,
      }),
    ).rejects.toThrow("only once");
  });
});
