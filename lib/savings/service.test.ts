import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuditAction,
  MemberStatus,
  Prisma,
  SavingsAccountStatus,
  TransactionType,
} from "@prisma/client";

const runAuditedMutation = vi.fn();

vi.mock("@/lib/audit/mutation", () => ({
  runAuditedMutation,
}));

describe("recordSavingsTransaction", () => {
  beforeEach(() => {
    runAuditedMutation.mockReset();
  });

  it("records a deposit, activates a pending member, and tags the audit action correctly", async () => {
    const lockedAccount = {
      id: "account-1",
      memberId: "member-1",
      accountNumber: "SAV-000001",
      balance: new Prisma.Decimal("100.00"),
      status: SavingsAccountStatus.ACTIVE,
      memberNumber: "HLUSCA-000001",
      firstName: "Rose",
      lastName: "Ayo",
      memberStatus: MemberStatus.PENDING,
    };
    const savingsAccountUpdate = vi.fn().mockResolvedValue({
      balance: new Prisma.Decimal("160.00"),
    });
    const memberUpdate = vi.fn().mockResolvedValue({
      status: MemberStatus.ACTIVE,
    });
    const transactionCreate = vi.fn().mockResolvedValue({
      id: "txn-1",
      type: TransactionType.DEPOSIT,
      amount: new Prisma.Decimal("60.00"),
      balanceAfter: new Prisma.Decimal("160.00"),
      reference: "RCPT-9",
      narrative: "Opening contribution",
      createdAt: new Date("2026-09-01T10:00:00Z"),
      performedBy: {
        id: "user-1",
        username: "treasurer",
        role: "TREASURER",
      },
      savingsAccount: {
        member: {
          id: "member-1",
          memberNumber: "HLUSCA-000001",
          firstName: "Rose",
          lastName: "Ayo",
          status: MemberStatus.ACTIVE,
        },
      },
    });

    runAuditedMutation.mockImplementation(async (context, execute) => {
      expect(context.action).toBe(AuditAction.DEPOSIT);
      expect(context.entityType).toBe("Transaction");
      expect(context.metadata).toMatchObject({
        savingsAccountId: "account-1",
        transactionType: TransactionType.DEPOSIT,
        amount: "60",
      });

      const outcome = await execute({
        $queryRaw: vi.fn().mockResolvedValue([lockedAccount]),
        savingsAccount: {
          update: savingsAccountUpdate,
        },
        transaction: {
          create: transactionCreate,
        },
        member: {
          update: memberUpdate,
        },
      });

      return outcome.result;
    });

    const { recordSavingsTransaction } = await import("@/lib/savings/service");

    const result = await recordSavingsTransaction(
      {
        accountId: "account-1",
        kind: "deposit",
        amount: "60.00",
        reference: "RCPT-9",
        narrative: "Opening contribution",
      },
      {
        id: "user-1",
        role: "TREASURER",
      },
      {
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
      },
    );

    expect(savingsAccountUpdate).toHaveBeenCalledWith({
      where: {
        id: "account-1",
      },
      data: {
        balance: new Prisma.Decimal("160.00"),
      },
    });
    expect(memberUpdate).toHaveBeenCalledWith({
      where: {
        id: "member-1",
      },
      data: {
        status: MemberStatus.ACTIVE,
      },
    });
    expect(transactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: TransactionType.DEPOSIT,
          amount: new Prisma.Decimal("60.00"),
          balanceAfter: new Prisma.Decimal("160.00"),
          performedById: "user-1",
        }),
      }),
    );
    expect(result.activatedMember).toBe(true);
    expect(result.balance).toBe("160");
  });

  it("rejects an overdrawn withdrawal after choosing the withdrawal audit action", async () => {
    runAuditedMutation.mockImplementation(async (context, execute) => {
      expect(context.action).toBe(AuditAction.WITHDRAW);

      return execute({
        $queryRaw: vi.fn().mockResolvedValue([
          {
            id: "account-2",
            memberId: "member-2",
            accountNumber: "SAV-000002",
            balance: new Prisma.Decimal("75.00"),
            status: SavingsAccountStatus.ACTIVE,
            memberNumber: "HLUSCA-000002",
            firstName: "Paul",
            lastName: "Okot",
            memberStatus: MemberStatus.ACTIVE,
          },
        ]),
        savingsAccount: {
          update: vi.fn(),
        },
        transaction: {
          create: vi.fn(),
        },
        member: {
          update: vi.fn(),
        },
      });
    });

    const { recordSavingsTransaction } = await import("@/lib/savings/service");

    await expect(
      recordSavingsTransaction(
        {
          accountId: "account-2",
          kind: "withdraw",
          amount: "120.00",
        },
        {
          id: "user-1",
          role: "TREASURER",
        },
        {
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
        },
      ),
    ).rejects.toThrow("exceeds the available savings balance");
  });
});
