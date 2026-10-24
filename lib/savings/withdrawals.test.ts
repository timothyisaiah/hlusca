import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import {
  withdrawalApproveSchema,
  withdrawalDisburseSchema,
  withdrawalRejectSchema,
  withdrawalRequestSchema,
} from "@/lib/savings/schemas";

const verifyPassword = vi.fn();

vi.mock("@/lib/auth/passwords", () => ({ verifyPassword }));

const client = { id: "user-client", role: "CLIENT" as const, memberId: "member-1" };
const treasurer = { id: "user-treasurer", role: "TREASURER" as const, memberId: null };

function lockedAccount(balance: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "account-1",
    balance: new Prisma.Decimal(balance),
    status: "ACTIVE",
    memberStatus: "ACTIVE",
    ...overrides,
  };
}

function storedRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "wdr-1",
    memberId: "member-1",
    savingsAccountId: "account-1",
    amount: new Prisma.Decimal("400.00"),
    payoutMethod: "MOBILE_MONEY",
    payoutDetails: "+256700000001",
    reason: "School fees",
    status: "PENDING",
    ...overrides,
  };
}

function makeDb(options: {
  account?: ReturnType<typeof lockedAccount>;
  request?: ReturnType<typeof storedRequest>;
  openTotal?: string;
  savingsBalance?: string;
  failures?: number;
}) {
  return {
    $queryRaw: vi.fn().mockResolvedValue(options.account ? [options.account] : []),
    withdrawalRequest: {
      findUnique: vi.fn().mockResolvedValue(options.request ?? null),
      aggregate: vi.fn().mockResolvedValue({
        _sum: {
          amount: options.openTotal ? new Prisma.Decimal(options.openTotal) : null,
        },
      }),
      create: vi.fn(async ({ data }) => ({ id: "wdr-new", status: "PENDING", ...data })),
      update: vi.fn(async ({ data }) => ({ ...options.request, ...data })),
    },
    savingsAccount: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        balance: new Prisma.Decimal(options.savingsBalance ?? "1000.00"),
        status: "ACTIVE",
      }),
      update: vi.fn(),
    },
    transaction: {
      create: vi.fn(async ({ data }) => ({ id: "txn-1", ...data })),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: "user-client", passwordHash: "hash" }),
    },
    notification: { create: vi.fn() },
    auditLog: { count: vi.fn().mockResolvedValue(options.failures ?? 0) },
  };
}

type TestDb = Prisma.TransactionClient;

const request = (input: unknown) => withdrawalRequestSchema.parse(input);
const approve = (input: unknown) => withdrawalApproveSchema.parse(input);
const reject = (input: unknown) => withdrawalRejectSchema.parse(input);
const disburse = (input: unknown) => withdrawalDisburseSchema.parse(input);

describe("submitWithdrawalRequest", () => {
  it("reserves balance already claimed by other open requests", async () => {
    const { submitWithdrawalRequest } = await import("@/lib/savings/withdrawals");
    const db = makeDb({ account: lockedAccount("1000.00"), openTotal: "700.00" });

    await expect(
      submitWithdrawalRequest(db as unknown as TestDb, client, request({
        amount: "400.00",
        payoutMethod: "CASH",
      })),
    ).rejects.toThrow("after your other open withdrawal requests");
    expect(db.withdrawalRequest.create).not.toHaveBeenCalled();
  });

  it("creates a pending request without moving the savings balance", async () => {
    const { submitWithdrawalRequest } = await import("@/lib/savings/withdrawals");
    const db = makeDb({ account: lockedAccount("1000.00"), openTotal: "200.00" });

    const outcome = await submitWithdrawalRequest(db as unknown as TestDb, client, request({
      amount: "800.00",
      payoutMethod: "CASH",
      payoutDetails: "ignored for cash",
    }));

    expect(outcome.result.status).toBe("PENDING");
    expect(db.withdrawalRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        memberId: "member-1",
        savingsAccountId: "account-1",
        amount: new Prisma.Decimal("800.00"),
        payoutDetails: null,
        requestedById: "user-client",
      }),
    });
    expect(db.savingsAccount.update).not.toHaveBeenCalled();
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it("requires an active membership", async () => {
    const { submitWithdrawalRequest } = await import("@/lib/savings/withdrawals");
    const db = makeDb({
      account: lockedAccount("1000.00", { memberStatus: "SUSPENDED" }),
    });

    await expect(
      submitWithdrawalRequest(db as unknown as TestDb, client, request({
        amount: "10.00",
        payoutMethod: "CASH",
      })),
    ).rejects.toThrow("active membership");
  });

  it("is only available to clients", async () => {
    const { submitWithdrawalRequest } = await import("@/lib/savings/withdrawals");

    await expect(
      submitWithdrawalRequest(makeDb({}) as unknown as TestDb, treasurer, request({
        amount: "10.00",
        payoutMethod: "CASH",
      })),
    ).rejects.toThrow("Forbidden");
  });
});

describe("cancelWithdrawalRequest", () => {
  it("hides other members' requests", async () => {
    const { cancelWithdrawalRequest } = await import("@/lib/savings/withdrawals");
    const db = makeDb({ request: storedRequest({ memberId: "member-2" }) });

    await expect(
      cancelWithdrawalRequest(db as unknown as TestDb, client, "wdr-1"),
    ).rejects.toThrow("not found");
    expect(db.withdrawalRequest.update).not.toHaveBeenCalled();
  });

  it("cannot cancel a paid-out request", async () => {
    const { cancelWithdrawalRequest } = await import("@/lib/savings/withdrawals");
    const db = makeDb({ request: storedRequest({ status: "DISBURSED" }) });

    await expect(
      cancelWithdrawalRequest(db as unknown as TestDb, client, "wdr-1"),
    ).rejects.toThrow("Only a pending or approved request");
  });
});

describe("reviewWithdrawalRequest", () => {
  it("approves a pending request and notifies the member", async () => {
    const { reviewWithdrawalRequest } = await import("@/lib/savings/withdrawals");
    const db = makeDb({ request: storedRequest(), savingsBalance: "1000.00" });

    const outcome = await reviewWithdrawalRequest(
      db as unknown as TestDb,
      treasurer,
      "wdr-1",
      "APPROVED",
      approve({}),
    );

    expect(outcome.result.status).toBe("APPROVED");
    expect(db.withdrawalRequest.update).toHaveBeenCalledWith({
      where: { id: "wdr-1" },
      data: expect.objectContaining({ status: "APPROVED", reviewedById: "user-treasurer" }),
    });
    expect(db.notification.create).toHaveBeenCalledOnce();
  });

  it("refuses approval when the balance no longer covers the request", async () => {
    const { reviewWithdrawalRequest } = await import("@/lib/savings/withdrawals");
    const db = makeDb({ request: storedRequest(), savingsBalance: "100.00" });

    await expect(
      reviewWithdrawalRequest(db as unknown as TestDb, treasurer, "wdr-1", "APPROVED", approve({})),
    ).rejects.toThrow("no longer covers");
  });

  it("stops a treasurer reviewing their own request", async () => {
    const { reviewWithdrawalRequest } = await import("@/lib/savings/withdrawals");
    const db = makeDb({ request: storedRequest() });

    await expect(
      reviewWithdrawalRequest(
        db as unknown as TestDb,
        { ...treasurer, memberId: "member-1" },
        "wdr-1",
        "REJECTED",
        reject({ comment: "Not today" }),
      ),
    ).rejects.toThrow("Another Treasurer");
  });

  it("only reviews pending requests", async () => {
    const { reviewWithdrawalRequest } = await import("@/lib/savings/withdrawals");
    const db = makeDb({ request: storedRequest({ status: "APPROVED" }) });

    await expect(
      reviewWithdrawalRequest(db as unknown as TestDb, treasurer, "wdr-1", "APPROVED", approve({})),
    ).rejects.toThrow("Only a pending request");
  });
});

describe("disburseWithdrawalRequest", () => {
  beforeEach(() => {
    verifyPassword.mockReset();
  });

  it("requires password confirmation", async () => {
    verifyPassword.mockResolvedValue(false);
    const { disburseWithdrawalRequest } = await import("@/lib/savings/withdrawals");
    const db = makeDb({ request: storedRequest({ status: "APPROVED" }) });

    await expect(
      disburseWithdrawalRequest(db as unknown as TestDb, treasurer, "wdr-1", disburse({
        password: "wrong",
        confirm: true,
      })),
    ).rejects.toThrow("Password confirmation failed");
    expect(db.savingsAccount.update).not.toHaveBeenCalled();
  });

  it("throttles repeated failures", async () => {
    const { disburseWithdrawalRequest } = await import("@/lib/savings/withdrawals");
    const db = makeDb({ failures: 8 });

    await expect(
      disburseWithdrawalRequest(db as unknown as TestDb, treasurer, "wdr-1", disburse({
        password: "secret",
        confirm: true,
      })),
    ).rejects.toThrow("Too many failed payout attempts");
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it("only pays out approved requests", async () => {
    verifyPassword.mockResolvedValue(true);
    const { disburseWithdrawalRequest } = await import("@/lib/savings/withdrawals");
    const db = makeDb({
      request: storedRequest({ status: "PENDING" }),
      account: lockedAccount("1000.00"),
    });

    await expect(
      disburseWithdrawalRequest(db as unknown as TestDb, treasurer, "wdr-1", disburse({
        password: "secret",
        confirm: true,
      })),
    ).rejects.toThrow("Only an approved request");
  });

  it("re-checks the locked balance before debiting", async () => {
    verifyPassword.mockResolvedValue(true);
    const { disburseWithdrawalRequest } = await import("@/lib/savings/withdrawals");
    const db = makeDb({
      request: storedRequest({ status: "APPROVED" }),
      account: lockedAccount("300.00"),
    });

    await expect(
      disburseWithdrawalRequest(db as unknown as TestDb, treasurer, "wdr-1", disburse({
        password: "secret",
        confirm: true,
      })),
    ).rejects.toThrow("exceeds the available savings balance");
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it("debits savings, writes a WITHDRAWAL transaction, and closes the request", async () => {
    verifyPassword.mockResolvedValue(true);
    const { disburseWithdrawalRequest } = await import("@/lib/savings/withdrawals");
    const db = makeDb({
      request: storedRequest({ status: "APPROVED" }),
      account: lockedAccount("1000.00"),
    });

    const outcome = await disburseWithdrawalRequest(
      db as unknown as TestDb,
      treasurer,
      "wdr-1",
      disburse({ password: "secret", reference: "MM-12345", confirm: true }),
    );

    expect(db.savingsAccount.update).toHaveBeenCalledWith({
      where: { id: "account-1" },
      data: { balance: new Prisma.Decimal("600.00") },
    });
    expect(db.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "WITHDRAWAL",
        amount: new Prisma.Decimal("400.00"),
        balanceAfter: new Prisma.Decimal("600.00"),
        reference: "MM-12345",
        performedById: "user-treasurer",
      }),
    });
    expect(db.withdrawalRequest.update).toHaveBeenCalledWith({
      where: { id: "wdr-1" },
      data: expect.objectContaining({
        status: "DISBURSED",
        disbursedById: "user-treasurer",
        transactionId: "txn-1",
      }),
    });
    expect(outcome.result).toMatchObject({ status: "DISBURSED", balance: "600" });
    expect(db.notification.create).toHaveBeenCalledOnce();
  });
});

describe("listWithdrawalRequests", () => {
  it("prevents a client from listing another member's requests", async () => {
    const { listWithdrawalRequests } = await import("@/lib/savings/withdrawals");

    await expect(
      listWithdrawalRequests(client, { memberId: "member-2" }, makeDb({}) as unknown as TestDb),
    ).rejects.toThrow("Forbidden");
  });
});
