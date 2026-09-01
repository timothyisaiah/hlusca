import {
  AuditAction,
  MemberStatus,
  Prisma,
  SavingsAccountStatus,
  TransactionType,
  UserRole,
} from "@prisma/client";

import { ApiError, notFoundMessage } from "../api";
import { runAuditedMutation } from "../audit/mutation";
import type { RequestMetadata } from "../audit/request";
import { DATABASE_SCHEMA, ROLE_LABELS } from "../constants";
import { prisma } from "../db";
import type {
  ClientSavingsDashboard,
  SavingsLedgerPage,
  SavingsLedgerSummary,
  SavingsMemberListItem,
  SavingsTransactionRecord,
  TreasurerSavingsWorkspace,
} from "./types";

type AuditActor = {
  id: string;
  role: UserRole;
};

export type SavingsMutationKind = "deposit" | "withdraw";

export interface SavingsLedgerFilters {
  query?: string;
  type?: TransactionType;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
  takeAll?: boolean;
}

const memberListInclude = {
  user: {
    select: {
      username: true,
    },
  },
  savingsAccount: {
    select: {
      id: true,
      accountNumber: true,
      balance: true,
      status: true,
      openedAt: true,
      transactions: {
        select: {
          createdAt: true,
          type: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  },
} satisfies Prisma.MemberInclude;

const transactionInclude = {
  performedBy: {
    select: {
      id: true,
      username: true,
      role: true,
    },
  },
  savingsAccount: {
    select: {
      member: {
        select: {
          id: true,
          memberNumber: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.TransactionInclude;

type MemberListModel = Prisma.MemberGetPayload<{
  include: typeof memberListInclude;
}>;

type TransactionModel = Prisma.TransactionGetPayload<{
  include: typeof transactionInclude;
}>;

type LockedAccountRow = {
  id: string;
  memberId: string;
  accountNumber: string;
  balance: Prisma.Decimal;
  status: SavingsAccountStatus;
  memberNumber: string;
  firstName: string;
  lastName: string;
  memberStatus: MemberStatus;
};

function toDecimalString(value: Prisma.Decimal | null | undefined) {
  return value?.toString() ?? "0";
}

function performerLabel(performedBy: {
  username: string | null;
  role: UserRole;
}) {
  return performedBy.username ?? ROLE_LABELS[performedBy.role];
}

function serializeMember(member: MemberListModel): SavingsMemberListItem {
  const latestTransaction = member.savingsAccount?.transactions[0];

  if (!member.savingsAccount) {
    throw new ApiError(
      "The member is missing a savings account.",
      500,
      "SAVINGS_ACCOUNT_MISSING",
    );
  }

  return {
    id: member.id,
    memberNumber: member.memberNumber,
    firstName: member.firstName,
    lastName: member.lastName,
    status: member.status,
    username: member.user?.username ?? null,
    account: {
      id: member.savingsAccount.id,
      accountNumber: member.savingsAccount.accountNumber,
      balance: toDecimalString(member.savingsAccount.balance),
      status: member.savingsAccount.status,
      openedAt: member.savingsAccount.openedAt.toISOString(),
    },
    lastTransactionAt: latestTransaction?.createdAt.toISOString() ?? null,
    lastTransactionType: latestTransaction?.type ?? null,
  };
}

function serializeTransaction(transaction: TransactionModel): SavingsTransactionRecord {
  const member = transaction.savingsAccount.member;

  return {
    id: transaction.id,
    type: transaction.type,
    amount: toDecimalString(transaction.amount),
    balanceAfter: toDecimalString(transaction.balanceAfter),
    reference: transaction.reference,
    narrative: transaction.narrative,
    createdAt: transaction.createdAt.toISOString(),
    performedBy: transaction.performedBy
      ? {
          id: transaction.performedBy.id,
          username: transaction.performedBy.username,
          role: transaction.performedBy.role,
          label: performerLabel(transaction.performedBy),
        }
      : null,
    member: member
      ? {
          id: member.id,
          memberNumber: member.memberNumber,
          name: `${member.firstName} ${member.lastName}`,
          status: member.status,
        }
      : null,
  };
}

function buildTransactionWhere(
  accountId: string,
  filters: SavingsLedgerFilters,
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {
    savingsAccountId: accountId,
  };

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.from || filters.to) {
    where.createdAt = {};

    if (filters.from) {
      where.createdAt.gte = filters.from;
    }

    if (filters.to) {
      where.createdAt.lte = filters.to;
    }
  }

  if (filters.query) {
    where.OR = [
      {
        reference: {
          contains: filters.query,
          mode: "insensitive",
        },
      },
      {
        narrative: {
          contains: filters.query,
          mode: "insensitive",
        },
      },
      {
        performedBy: {
          username: {
            contains: filters.query,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  return where;
}

function buildLedgerSummary(input: {
  currentBalance: string;
  totalDeposited: string;
  totalWithdrawn: string;
  transactionCount: number;
  lastTransactionAt: Date | null;
}): SavingsLedgerSummary {
  const deposited = new Prisma.Decimal(input.totalDeposited);
  const withdrawn = new Prisma.Decimal(input.totalWithdrawn);
  const totalMovement = deposited.plus(withdrawn);
  const depositShare =
    totalMovement.eq(0)
      ? 0
      : Number(deposited.div(totalMovement).mul(100).toFixed(1));

  return {
    currentBalance: input.currentBalance,
    totalDeposited: input.totalDeposited,
    totalWithdrawn: input.totalWithdrawn,
    netFlow: deposited.minus(withdrawn).toString(),
    transactionCount: input.transactionCount,
    lastTransactionAt: input.lastTransactionAt?.toISOString() ?? null,
    depositShare,
  };
}

async function getSavingsMember(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: memberListInclude,
  });

  if (!member) {
    throw new ApiError(notFoundMessage("member"), 404, "NOT_FOUND");
  }

  return member;
}

async function getLedgerSummaryForAccount(accountId: string, currentBalance: string) {
  const [depositAggregate, withdrawalAggregate, transactionCount, lastTransaction] =
    await Promise.all([
      prisma.transaction.aggregate({
        where: {
          savingsAccountId: accountId,
          type: TransactionType.DEPOSIT,
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.transaction.aggregate({
        where: {
          savingsAccountId: accountId,
          type: TransactionType.WITHDRAWAL,
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.transaction.count({
        where: {
          savingsAccountId: accountId,
        },
      }),
      prisma.transaction.findFirst({
        where: {
          savingsAccountId: accountId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
        },
      }),
    ]);

  return buildLedgerSummary({
    currentBalance,
    totalDeposited: toDecimalString(depositAggregate._sum.amount),
    totalWithdrawn: toDecimalString(withdrawalAggregate._sum.amount),
    transactionCount,
    lastTransactionAt: lastTransaction?.createdAt ?? null,
  });
}

export function buildSavingsMutationAction(kind: SavingsMutationKind) {
  return kind === "deposit" ? AuditAction.DEPOSIT : AuditAction.WITHDRAW;
}

export function buildSavingsTransactionType(kind: SavingsMutationKind) {
  return kind === "deposit" ? TransactionType.DEPOSIT : TransactionType.WITHDRAWAL;
}

export async function listMemberTransactions(
  memberId: string,
  filters: SavingsLedgerFilters = {},
) {
  const member = await getSavingsMember(memberId);
  const serializedMember = serializeMember(member);
  const accountId = serializedMember.account.id;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 8;
  const where = buildTransactionWhere(accountId, filters);
  const skip = filters.takeAll ? undefined : (page - 1) * pageSize;
  const take = filters.takeAll ? undefined : pageSize;

  const [transactions, totalCount, summary] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: transactionInclude,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take,
    }),
    prisma.transaction.count({
      where,
    }),
    getLedgerSummaryForAccount(accountId, serializedMember.account.balance),
  ]);

  const totalPages = filters.takeAll ? 1 : Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    member: serializedMember,
    summary,
    transactions: transactions.map(serializeTransaction),
    pagination: {
      page: filters.takeAll ? 1 : page,
      pageSize: filters.takeAll ? transactions.length || pageSize : pageSize,
      totalCount,
      totalPages,
    },
  } satisfies SavingsLedgerPage;
}

export async function getClientSavingsDashboard(
  memberId: string,
): Promise<ClientSavingsDashboard> {
  const ledger = await listMemberTransactions(memberId, {
    takeAll: true,
  });

  return {
    member: ledger.member,
    ledger,
  };
}

export async function getTreasurerSavingsWorkspace(
  selectedMemberId?: string,
): Promise<TreasurerSavingsWorkspace> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    members,
    accountAggregate,
    activeAccounts,
    pendingActivations,
    monthlyDeposits,
    monthlyWithdrawals,
    recentTransactions,
  ] = await Promise.all([
    prisma.member.findMany({
      include: memberListInclude,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.savingsAccount.aggregate({
      _sum: {
        balance: true,
      },
    }),
    prisma.savingsAccount.count({
      where: {
        status: SavingsAccountStatus.ACTIVE,
      },
    }),
    prisma.member.count({
      where: {
        status: MemberStatus.PENDING,
      },
    }),
    prisma.transaction.aggregate({
      where: {
        type: TransactionType.DEPOSIT,
        createdAt: {
          gte: monthStart,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.transaction.aggregate({
      where: {
        type: TransactionType.WITHDRAWAL,
        createdAt: {
          gte: monthStart,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.transaction.findMany({
      include: transactionInclude,
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
  ]);

  const serializedMembers = members.map(serializeMember);
  const selectedMember =
    serializedMembers.find((member) => member.id === selectedMemberId) ??
    serializedMembers[0] ??
    null;

  const monthlyDepositsAmount = new Prisma.Decimal(
    toDecimalString(monthlyDeposits._sum.amount),
  );
  const monthlyWithdrawalsAmount = new Prisma.Decimal(
    toDecimalString(monthlyWithdrawals._sum.amount),
  );

  return {
    summary: {
      totalSavings: toDecimalString(accountAggregate._sum.balance),
      activeAccounts,
      pendingActivations,
      monthlyDeposits: monthlyDepositsAmount.toString(),
      monthlyWithdrawals: monthlyWithdrawalsAmount.toString(),
      monthlyNetFlow: monthlyDepositsAmount.minus(monthlyWithdrawalsAmount).toString(),
      monthlyTransactionCount:
        monthlyDeposits._count._all + monthlyWithdrawals._count._all,
    },
    members: serializedMembers,
    selectedMember,
    selectedLedger: selectedMember
      ? await listMemberTransactions(selectedMember.id, {
          takeAll: true,
        })
      : null,
    recentTransactions: recentTransactions.map(serializeTransaction),
  };
}

export async function recordSavingsTransaction(
  input: {
    accountId: string;
    kind: SavingsMutationKind;
    amount: string;
    reference?: string;
    narrative?: string;
  },
  actor: AuditActor,
  requestMeta: RequestMetadata,
) {
  const amount = new Prisma.Decimal(input.amount);
  const action = buildSavingsMutationAction(input.kind);
  const transactionType = buildSavingsTransactionType(input.kind);
  const normalizedReference = input.reference?.trim() || null;
  const normalizedNarrative = input.narrative?.trim() || null;

  return runAuditedMutation(
    {
      actorId: actor.id,
      actorRole: actor.role,
      action,
      entityType: "Transaction",
      metadata: {
        savingsAccountId: input.accountId,
        transactionType,
        amount: amount.toString(),
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    },
    async (tx) => {
      const [lockedAccount] = await tx.$queryRaw<LockedAccountRow[]>(Prisma.sql`
        SELECT
          sa."id",
          sa."memberId",
          sa."accountNumber",
          sa."balance",
          sa."status",
          m."memberNumber",
          m."firstName",
          m."lastName",
          m."status" AS "memberStatus"
        FROM ${Prisma.raw(`"${DATABASE_SCHEMA}"."SavingsAccount"`)} AS sa
        INNER JOIN ${Prisma.raw(`"${DATABASE_SCHEMA}"."Member"`)} AS m
          ON m."id" = sa."memberId"
        WHERE sa."id" = ${input.accountId}
        FOR UPDATE
      `);

      if (!lockedAccount) {
        throw new ApiError(notFoundMessage("savings account"), 404, "NOT_FOUND");
      }

      if (lockedAccount.status !== SavingsAccountStatus.ACTIVE) {
        throw new ApiError(
          "Only active savings accounts can accept transactions.",
          409,
          "ACCOUNT_INACTIVE",
        );
      }

      const previousBalance = new Prisma.Decimal(lockedAccount.balance);

      if (input.kind === "withdraw" && previousBalance.lt(amount)) {
        throw new ApiError(
          "The withdrawal amount exceeds the available savings balance.",
          409,
          "INSUFFICIENT_BALANCE",
        );
      }

      const nextBalance =
        input.kind === "deposit"
          ? previousBalance.plus(amount)
          : previousBalance.minus(amount);

      const updatedAccount = await tx.savingsAccount.update({
        where: {
          id: input.accountId,
        },
        data: {
          balance: nextBalance,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          savingsAccountId: input.accountId,
          type: transactionType,
          amount,
          balanceAfter: nextBalance,
          reference: normalizedReference,
          narrative: normalizedNarrative,
          performedById: actor.id,
        },
        include: transactionInclude,
      });

      let nextMemberStatus = lockedAccount.memberStatus;

      if (
        input.kind === "deposit" &&
        lockedAccount.memberStatus === MemberStatus.PENDING
      ) {
        await tx.member.update({
          where: {
            id: lockedAccount.memberId,
          },
          data: {
            status: MemberStatus.ACTIVE,
          },
        });

        nextMemberStatus = MemberStatus.ACTIVE;
      }

      return {
        result: {
          memberId: lockedAccount.memberId,
          memberNumber: lockedAccount.memberNumber,
          balance: updatedAccount.balance.toString(),
          transaction: serializeTransaction(transaction),
          activatedMember: nextMemberStatus !== lockedAccount.memberStatus,
        },
        entityId: transaction.id,
        beforeState: {
          memberId: lockedAccount.memberId,
          memberStatus: lockedAccount.memberStatus,
          balance: previousBalance.toString(),
        },
        afterState: {
          memberId: lockedAccount.memberId,
          memberStatus: nextMemberStatus,
          balance: nextBalance.toString(),
          transactionType,
          amount: amount.toString(),
          reference: normalizedReference,
          narrative: normalizedNarrative,
        },
        metadata: {
          savingsAccountId: input.accountId,
          memberId: lockedAccount.memberId,
          memberNumber: lockedAccount.memberNumber,
          transactionType,
        },
      };
    },
  );
}
