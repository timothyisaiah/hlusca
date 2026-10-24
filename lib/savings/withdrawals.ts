import {
  Prisma,
  type SavingsAccountStatus,
  type MemberStatus,
  type UserRole,
  type WithdrawalRequestStatus,
} from "@prisma/client";
import type { z } from "zod";

import { ApiError, notFoundMessage } from "../api";
import { verifyPassword } from "../auth/passwords";
import { DATABASE_SCHEMA, ROLE_LABELS } from "../constants";
import { prisma } from "../db";
import { assertLoanRole, snapshot, type LoanActor } from "../loans/service";
import { formatCurrency, titleCase } from "../utils";
import type {
  withdrawalApproveSchema,
  withdrawalDisburseSchema,
  withdrawalRejectSchema,
  withdrawalRequestSchema,
} from "./schemas";
import type {
  MemberWithdrawalOverview,
  TreasurerWithdrawalQueue,
  WithdrawalRequestRecord,
} from "./types";

type Db = Prisma.TransactionClient;

// Requests that still hold a claim on the member's savings balance.
export const OPEN_WITHDRAWAL_STATUSES: WithdrawalRequestStatus[] = [
  "PENDING",
  "APPROVED",
];

const requestInclude = {
  member: {
    select: { id: true, memberNumber: true, firstName: true, lastName: true },
  },
  savingsAccount: { select: { accountNumber: true, balance: true } },
  reviewedBy: { select: { username: true, role: true } },
  disbursedBy: { select: { username: true, role: true } },
  transaction: { select: { reference: true } },
} satisfies Prisma.WithdrawalRequestInclude;

type RequestModel = Prisma.WithdrawalRequestGetPayload<{
  include: typeof requestInclude;
}>;

type LockedAccountRow = {
  id: string;
  balance: Prisma.Decimal;
  status: SavingsAccountStatus;
  memberStatus: MemberStatus;
};

const table = (name: string) => Prisma.raw(`"${DATABASE_SCHEMA}"."${name}"`);

function staffLabel(user: { username: string | null; role: UserRole } | null) {
  return user ? (user.username ?? ROLE_LABELS[user.role]) : null;
}

function serializeRequest(row: RequestModel): WithdrawalRequestRecord {
  return {
    id: row.id,
    amount: row.amount.toString(),
    payoutMethod: row.payoutMethod,
    payoutDetails: row.payoutDetails,
    reason: row.reason,
    status: row.status,
    requestedAt: row.requestedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedBy: staffLabel(row.reviewedBy),
    reviewComment: row.reviewComment,
    disbursedAt: row.disbursedAt?.toISOString() ?? null,
    disbursedBy: staffLabel(row.disbursedBy),
    transactionReference: row.transaction?.reference ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    member: {
      id: row.member.id,
      memberNumber: row.member.memberNumber,
      name: `${row.member.firstName} ${row.member.lastName}`,
      accountNumber: row.savingsAccount.accountNumber,
      balance: row.savingsAccount.balance.toString(),
    },
  };
}

// Same account/member lock as deposits, withdrawals and dividend posting.
async function lockMemberAccount(db: Db, memberId: string) {
  const [account] = await db.$queryRaw<LockedAccountRow[]>(Prisma.sql`
    SELECT a."id", a."balance", a."status", m."status" AS "memberStatus"
    FROM ${table("SavingsAccount")} a
    JOIN ${table("Member")} m ON m."id" = a."memberId"
    WHERE a."memberId" = ${memberId}
    FOR UPDATE OF a, m
  `);

  if (!account) {
    throw new ApiError(notFoundMessage("savings account"), 404, "NOT_FOUND");
  }

  return { ...account, balance: new Prisma.Decimal(account.balance) };
}

async function lockRequest(db: Db, id: string) {
  await db.$queryRaw(Prisma.sql`
    SELECT "id" FROM ${table("WithdrawalRequest")} WHERE "id" = ${id} FOR UPDATE
  `);
  const request = await db.withdrawalRequest.findUnique({ where: { id } });

  if (!request) {
    throw new ApiError(notFoundMessage("withdrawal request"), 404, "NOT_FOUND");
  }

  return request;
}

async function openRequestTotal(db: Db, savingsAccountId: string) {
  const aggregate = await db.withdrawalRequest.aggregate({
    where: { savingsAccountId, status: { in: OPEN_WITHDRAWAL_STATUSES } },
    _sum: { amount: true },
  });

  return aggregate._sum.amount ?? new Prisma.Decimal(0);
}

async function notifyMember(db: Db, memberId: string, message: string) {
  const user = await db.user.findUnique({
    where: { memberId },
    select: { id: true },
  });

  if (user) {
    await db.notification.create({
      data: { userId: user.id, type: "SYSTEM", message },
    });
  }
}

function assertNotOwnRequest(actor: LoanActor, memberId: string) {
  if (actor.memberId && actor.memberId === memberId) {
    throw new ApiError(
      "Another Treasurer must handle your own withdrawal request.",
      403,
    );
  }
}

export async function submitWithdrawalRequest(
  db: Db,
  actor: LoanActor,
  input: z.infer<typeof withdrawalRequestSchema>,
) {
  assertLoanRole(actor, ["CLIENT"]);

  if (!actor.memberId) {
    throw new ApiError("A member profile is required to request a withdrawal.", 403);
  }

  const account = await lockMemberAccount(db, actor.memberId);

  if (account.status !== "ACTIVE" || account.memberStatus !== "ACTIVE") {
    throw new ApiError(
      "An active membership and savings account are required to request a withdrawal.",
      409,
    );
  }

  const amount = new Prisma.Decimal(input.amount);
  const committed = await openRequestTotal(db, account.id);
  const available = account.balance.minus(committed);

  if (amount.gt(available)) {
    throw new ApiError(
      committed.gt(0)
        ? `The amount exceeds your available balance of ${formatCurrency(available.toString())} after your other open withdrawal requests.`
        : `The amount exceeds your available balance of ${formatCurrency(available.toString())}.`,
      409,
      "INSUFFICIENT_BALANCE",
    );
  }

  const request = await db.withdrawalRequest.create({
    data: {
      memberId: actor.memberId,
      savingsAccountId: account.id,
      amount,
      payoutMethod: input.payoutMethod,
      payoutDetails: input.payoutMethod === "CASH" ? null : (input.payoutDetails ?? null),
      reason: input.reason ?? null,
      requestedById: actor.id,
    },
  });

  return {
    result: { id: request.id, status: request.status },
    entityId: request.id,
    beforeState: {
      savingsBalance: account.balance.toString(),
      openRequestTotal: committed.toString(),
    },
    afterState: snapshot(request),
  };
}

export async function cancelWithdrawalRequest(
  db: Db,
  actor: LoanActor,
  id: string,
) {
  assertLoanRole(actor, ["CLIENT"]);
  const before = await lockRequest(db, id);

  if (before.memberId !== actor.memberId) {
    throw new ApiError(notFoundMessage("withdrawal request"), 404, "NOT_FOUND");
  }

  if (!OPEN_WITHDRAWAL_STATUSES.includes(before.status)) {
    throw new ApiError(
      "Only a pending or approved request can be cancelled.",
      409,
    );
  }

  const after = await db.withdrawalRequest.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  return {
    result: { id, status: after.status },
    entityId: id,
    beforeState: snapshot(before),
    afterState: snapshot(after),
  };
}

export async function reviewWithdrawalRequest(
  db: Db,
  actor: LoanActor,
  id: string,
  decision: "APPROVED" | "REJECTED",
  input:
    | z.infer<typeof withdrawalApproveSchema>
    | z.infer<typeof withdrawalRejectSchema>,
) {
  assertLoanRole(actor, ["TREASURER"]);
  const before = await lockRequest(db, id);
  assertNotOwnRequest(actor, before.memberId);

  if (before.status !== "PENDING") {
    throw new ApiError("Only a pending request can be approved or rejected.", 409);
  }

  if (decision === "APPROVED") {
    const account = await db.savingsAccount.findUniqueOrThrow({
      where: { id: before.savingsAccountId },
      select: { balance: true, status: true },
    });

    if (account.status !== "ACTIVE") {
      throw new ApiError("The member's savings account is not active.", 409);
    }

    if (account.balance.lt(before.amount)) {
      throw new ApiError(
        "The member's savings balance no longer covers this request. Reject it with a reason instead.",
        409,
        "INSUFFICIENT_BALANCE",
      );
    }
  }

  const after = await db.withdrawalRequest.update({
    where: { id },
    data: {
      status: decision,
      reviewedById: actor.id,
      reviewedAt: new Date(),
      reviewComment: input.comment ?? null,
    },
  });

  const amount = formatCurrency(before.amount.toString());
  await notifyMember(
    db,
    before.memberId,
    decision === "APPROVED"
      ? `Your withdrawal request of ${amount} was approved and is awaiting payout by the Treasurer.`
      : `Your withdrawal request of ${amount} was rejected: ${input.comment}`,
  );

  return {
    result: { id, status: after.status },
    entityId: id,
    beforeState: snapshot(before),
    afterState: snapshot(after),
  };
}

export async function disburseWithdrawalRequest(
  db: Db,
  actor: LoanActor,
  id: string,
  input: z.infer<typeof withdrawalDisburseSchema>,
) {
  assertLoanRole(actor, ["TREASURER"]);
  const failures = await db.auditLog.count({
    where: {
      actorId: actor.id,
      action: "WITHDRAW",
      entityType: "WithdrawalRequest",
      status: "FAILURE",
      createdAt: { gte: new Date(Date.now() - 10 * 60_000) },
    },
  });

  if (failures >= 8) {
    throw new ApiError(
      "Too many failed payout attempts. Wait ten minutes before retrying.",
      429,
    );
  }

  const user = await db.user.findUnique({
    where: { id: actor.id },
    select: { passwordHash: true },
  });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new ApiError("Password confirmation failed.", 403);
  }

  const before = await lockRequest(db, id);
  assertNotOwnRequest(actor, before.memberId);

  if (before.status !== "APPROVED") {
    throw new ApiError("Only an approved request can be paid out.", 409);
  }

  const account = await lockMemberAccount(db, before.memberId);

  if (account.id !== before.savingsAccountId || account.status !== "ACTIVE") {
    throw new ApiError("The member's savings account is not active.", 409);
  }

  if (account.balance.lt(before.amount)) {
    throw new ApiError(
      "The withdrawal amount exceeds the available savings balance.",
      409,
      "INSUFFICIENT_BALANCE",
    );
  }

  const balanceAfter = account.balance.minus(before.amount);
  await db.savingsAccount.update({
    where: { id: account.id },
    data: { balance: balanceAfter },
  });

  const payout = before.payoutDetails
    ? `${titleCase(before.payoutMethod)} to ${before.payoutDetails}`
    : titleCase(before.payoutMethod);
  const transaction = await db.transaction.create({
    data: {
      savingsAccountId: account.id,
      type: "WITHDRAWAL",
      amount: before.amount,
      balanceAfter,
      reference: input.reference ?? `WDR-${id}`,
      narrative: `Member withdrawal request (${payout})${before.reason ? `: ${before.reason}` : ""}`.slice(0, 240),
      performedById: actor.id,
    },
  });

  const after = await db.withdrawalRequest.update({
    where: { id },
    data: {
      status: "DISBURSED",
      disbursedById: actor.id,
      disbursedAt: new Date(),
      transactionId: transaction.id,
    },
  });

  await notifyMember(
    db,
    before.memberId,
    `Your withdrawal of ${formatCurrency(before.amount.toString())} has been paid out (${payout}).`,
  );

  return {
    result: { id, status: after.status, balance: balanceAfter.toString() },
    entityId: id,
    beforeState: snapshot({ request: before, savingsBalance: account.balance }),
    afterState: snapshot({
      request: after,
      transaction,
      savingsBalance: balanceAfter,
    }),
  };
}

export async function listWithdrawalRequests(
  actor: LoanActor,
  filters: { status?: WithdrawalRequestStatus; memberId?: string } = {},
  db: Db = prisma,
) {
  let memberId = filters.memberId;

  if (actor.role === "CLIENT") {
    if (!actor.memberId || (memberId && memberId !== actor.memberId)) {
      throw new ApiError("Forbidden.", 403);
    }
    memberId = actor.memberId;
  } else {
    assertLoanRole(actor, ["TREASURER", "BOARD", "ADMIN"]);
  }

  const rows = await db.withdrawalRequest.findMany({
    where: { memberId, status: filters.status },
    include: requestInclude,
    orderBy: { requestedAt: "desc" },
    take: 100,
  });

  return rows.map(serializeRequest);
}

export async function getMemberWithdrawalOverview(
  memberId: string,
): Promise<MemberWithdrawalOverview> {
  const [rows, aggregate] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where: { memberId },
      include: requestInclude,
      orderBy: { requestedAt: "desc" },
      take: 20,
    }),
    prisma.withdrawalRequest.aggregate({
      where: { memberId, status: { in: OPEN_WITHDRAWAL_STATUSES } },
      _sum: { amount: true },
    }),
  ]);

  return {
    requests: rows.map(serializeRequest),
    openTotal: (aggregate._sum.amount ?? new Prisma.Decimal(0)).toString(),
  };
}

export async function getTreasurerWithdrawalQueue(): Promise<TreasurerWithdrawalQueue> {
  const [open, recent] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where: { status: { in: OPEN_WITHDRAWAL_STATUSES } },
      include: requestInclude,
      orderBy: { requestedAt: "asc" },
    }),
    prisma.withdrawalRequest.findMany({
      where: { status: { notIn: OPEN_WITHDRAWAL_STATUSES } },
      include: requestInclude,
      orderBy: { requestedAt: "desc" },
      take: 8,
    }),
  ]);

  return {
    open: open.map(serializeRequest),
    recent: recent.map(serializeRequest),
  };
}
