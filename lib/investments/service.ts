import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { ApiError } from "../api";
import { prisma } from "../db";
import { verifyPassword } from "../auth/passwords";
import {
  assertLoanRole as assertRole,
  snapshot,
  type LoanActor as Actor,
} from "../loans/service";
import { businessDate } from "../loans/reconciliation";
import {
  allocateDividends,
  averageBalanceBasis,
  dateNumber,
  DIVIDEND_METHOD,
  minorUnits,
  type DividendShare,
} from "./calculation";
import type {
  dividendDecisionSchema,
  dividendPostSchema,
  dividendRunSchema,
  investmentSchema,
  productSchema,
} from "./schemas";
import type {
  DividendHistoryRecord,
  InvestmentRecord,
  ProductRecord,
  RunRecord,
} from "./types";

type Db = Prisma.TransactionClient;
const serialize = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
const memberSelect = {
  id: true,
  memberNumber: true,
  firstName: true,
  lastName: true,
} as const;
const staffRoles = ["TREASURER", "BOARD", "ADMIN"] as const;

function scope(actor: Actor, memberId?: string) {
  if (actor.role === "CLIENT") {
    if (!actor.memberId || (memberId && memberId !== actor.memberId))
      throw new ApiError("Forbidden.", 403);
    return actor.memberId;
  }
  assertRole(actor, [...staffRoles]);
  return memberId;
}

export async function listProducts(
  actor: Actor,
  db: Db = prisma,
): Promise<ProductRecord[]> {
  assertRole(actor, ["CLIENT", ...staffRoles]);
  return serialize(
    await db.investmentProduct.findMany({
      where: actor.role === "ADMIN" ? {} : { active: true },
      orderBy: { name: "asc" },
    }),
  );
}

export async function saveProduct(
  db: Db,
  actor: Actor,
  input: z.infer<typeof productSchema>,
  id?: string,
) {
  assertRole(actor, ["ADMIN"]);
  if (id)
    await db.$queryRaw`SELECT id FROM hlusca."InvestmentProduct" WHERE id = ${id} FOR UPDATE`;
  const before = id
    ? await db.investmentProduct.findUnique({ where: { id } })
    : null;
  if (id && !before) throw new ApiError("Investment product not found.", 404);
  const duplicate = await db.investmentProduct.findFirst({
    where: {
      name: { equals: input.name, mode: "insensitive" },
      ...(id ? { id: { not: id } } : {}),
    },
  });
  if (duplicate)
    throw new ApiError(
      "An investment product with this name already exists.",
      409,
    );
  const result = id
    ? await db.investmentProduct.update({ where: { id }, data: input })
    : await db.investmentProduct.create({ data: input });
  return {
    result,
    entityId: result.id,
    beforeState: before ? snapshot(before) : undefined,
    afterState: snapshot(result),
  };
}

export async function listInvestments(
  actor: Actor,
  memberId?: string,
  db: Db = prisma,
): Promise<InvestmentRecord[]> {
  return serialize(
    await db.memberInvestment.findMany({
      where: { memberId: scope(actor, memberId) },
      include: { member: { select: memberSelect } },
      orderBy: { createdAt: "desc" },
    }),
  );
}

export async function recordInvestment(
  db: Db,
  actor: Actor,
  input: z.infer<typeof investmentSchema>,
) {
  assertRole(actor, ["ADMIN"]);
  if (input.startDate > businessDate())
    throw new ApiError("The investment start date cannot be in the future.");
  await db.$queryRaw`SELECT id FROM hlusca."InvestmentProduct" WHERE id = ${input.investmentProductId} FOR SHARE`;
  const product = await db.investmentProduct.findUnique({
    where: { id: input.investmentProductId },
  });
  const member = await db.member.findUnique({ where: { id: input.memberId } });
  if (!product?.active)
    throw new ApiError("Choose an active investment product.", 409);
  if (member?.status !== "ACTIVE")
    throw new ApiError("Choose an active member.", 409);
  const result = await db.memberInvestment.create({
    data: {
      ...input,
      startDate: new Date(input.startDate),
      maturityDate: new Date(input.maturityDate),
      productName: product.name,
      expectedReturnRate: product.expectedReturnRate,
      riskProfile: product.riskProfile,
    },
  });
  return { result, entityId: result.id, afterState: snapshot(result) };
}

export async function closeInvestment(
  db: Db,
  actor: Actor,
  id: string,
  status: "MATURED" | "CANCELLED",
) {
  assertRole(actor, ["ADMIN"]);
  await db.$queryRaw`SELECT id FROM hlusca."MemberInvestment" WHERE id = ${id} FOR UPDATE`;
  const before = await db.memberInvestment.findUnique({ where: { id } });
  if (!before) throw new ApiError("Investment not found.", 404);
  if (before.status !== "ACTIVE")
    throw new ApiError("This investment is already closed.", 409);
  if (
    status === "MATURED" &&
    before.maturityDate.toISOString().slice(0, 10) > businessDate()
  )
    throw new ApiError(
      "The investment has not reached its maturity date.",
      409,
    );
  const result = await db.memberInvestment.update({
    where: { id },
    data: { status },
  });
  return {
    result,
    entityId: id,
    beforeState: snapshot(before),
    afterState: snapshot(result),
  };
}

export async function listRuns(
  actor: Actor,
  db: Db = prisma,
): Promise<RunRecord[]> {
  assertRole(actor, [...staffRoles]);
  return serialize(
    await db.dividendRun.findMany({
      include: {
        runBy: { select: { username: true } },
        decidedBy: { select: { username: true } },
      },
      orderBy: { runDate: "desc" },
    }),
  );
}

export async function dividendHistory(
  actor: Actor,
  memberId?: string,
  db: Db = prisma,
): Promise<DividendHistoryRecord[]> {
  return serialize(
    await db.dividendAllocation.findMany({
      where: { memberId: scope(actor, memberId), run: { status: "POSTED" } },
      select: {
        id: true,
        amount: true,
        averageBalance: true,
        run: {
          select: {
            financialYear: true,
            periodStart: true,
            periodEnd: true,
            postedAt: true,
          },
        },
      },
      orderBy: { run: { postedAt: "desc" } },
    }),
  );
}

export async function proposeRun(
  db: Db,
  actor: Actor,
  input: z.infer<typeof dividendRunSchema>,
) {
  assertRole(actor, ["TREASURER"]);
  if (input.periodEnd >= businessDate())
    throw new ApiError("Only a completed financial year can be proposed.");
  // Serialize proposals to prevent differently-labelled, overlapping years racing.
  await db.$executeRaw`SELECT pg_advisory_xact_lock(68451206)`;
  const overlap = await db.dividendRun.findFirst({
    where: {
      status: { not: "REJECTED" },
      OR: [
        { financialYear: input.financialYear },
        {
          periodStart: { lte: new Date(input.periodEnd) },
          periodEnd: { gte: new Date(input.periodStart) },
        },
      ],
    },
  });
  if (overlap)
    throw new ApiError(
      "A dividend run already covers this financial year or overlaps these dates.",
      409,
    );
  const cutoff = new Date(`${input.periodEnd}T21:00:00Z`); // next Kampala midnight
  const accounts = await db.savingsAccount.findMany({
    where: {
      status: "ACTIVE",
      openedAt: { lt: cutoff },
      member: { status: "ACTIVE" },
    },
    select: { id: true, member: { select: memberSelect } },
    orderBy: { id: "asc" },
  });
  if (!accounts.length)
    throw new ApiError(
      "No active members have savings accounts eligible for this financial year.",
      409,
    );
  // Aggregate the immutable savings ledger in one query. Earlier movements form
  // the opening balance; multiple same-day movements are summed before weighting.
  const movements = await db.$queryRaw<
    { savingsAccountId: string; date: string; delta: string }[]
  >(Prisma.sql`
    SELECT "savingsAccountId", GREATEST(("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Kampala')::date, ${input.periodStart}::date)::text AS date,
      SUM(CASE WHEN type IN ('WITHDRAWAL', 'LOAN_REPAYMENT') THEN -amount ELSE amount END)::text AS delta
    FROM hlusca."Transaction"
    WHERE "savingsAccountId" IN (${Prisma.join(accounts.map((account) => account.id))}) AND "createdAt" < ${cutoff}
    GROUP BY 1, 2
  `);
  const byAccount = new Map<string, typeof movements>();
  for (const row of movements) {
    const rows = byAccount.get(row.savingsAccountId) ?? [];
    rows.push(row);
    byAccount.set(row.savingsAccountId, rows);
  }
  const days = dateNumber(input.periodEnd) - dateNumber(input.periodStart) + 1;
  const shares = allocateDividends(
    accounts.map((account) => ({
      memberId: account.member.id,
      savingsAccountId: account.id,
      memberNumber: account.member.memberNumber,
      memberName: `${account.member.firstName} ${account.member.lastName}`,
      balanceDaysMinor: averageBalanceBasis(
        byAccount.get(account.id) ?? [],
        input.periodStart,
        input.periodEnd,
      ),
    })),
    input.totalPoolAmount,
    days,
  );
  const result = await db.dividendRun.create({
    data: {
      ...input,
      periodStart: new Date(input.periodStart),
      periodEnd: new Date(input.periodEnd),
      calculationMethod: DIVIDEND_METHOD,
      calculationSnapshot: snapshot(shares),
      runById: actor.id,
    },
  });
  return { result, entityId: result.id, afterState: snapshot(result) };
}

async function lockedRun(db: Db, id: string) {
  await db.$queryRaw`SELECT id FROM hlusca."DividendRun" WHERE id = ${id} FOR UPDATE`;
  const run = await db.dividendRun.findUnique({ where: { id } });
  if (!run) throw new ApiError("Dividend run not found.", 404);
  return run;
}

export async function decideRun(
  db: Db,
  actor: Actor,
  id: string,
  input: z.infer<typeof dividendDecisionSchema>,
) {
  assertRole(actor, ["BOARD"]);
  const before = await lockedRun(db, id);
  if (before.status !== "PROPOSED")
    throw new ApiError("Only a proposed run can be approved or rejected.", 409);
  if (before.runById === actor.id)
    throw new ApiError("Another Board member must review your proposal.", 403);
  const result = await db.dividendRun.update({
    where: { id },
    data: {
      status: input.decision,
      decidedById: actor.id,
      decidedAt: new Date(),
      decisionComment: input.comment,
    },
  });
  return {
    result,
    entityId: id,
    beforeState: snapshot(before),
    afterState: snapshot(result),
  };
}

export async function postRun(
  db: Db,
  actor: Actor,
  id: string,
  input: z.infer<typeof dividendPostSchema>,
) {
  assertRole(actor, ["TREASURER"]);
  const user = await db.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: { passwordHash: true },
  });
  const failures = await db.auditLog.count({
    where: {
      actorId: actor.id,
      entityType: "DividendRun",
      status: "FAILURE",
      createdAt: { gte: new Date(Date.now() - 10 * 60_000) },
    },
  });
  if (failures >= 5)
    throw new ApiError(
      "Too many failed attempts. Try again in ten minutes.",
      429,
    );
  if (!(await verifyPassword(input.password, user.passwordHash)))
    throw new ApiError("Password confirmation failed.", 403);
  const before = await lockedRun(db, id);
  if (before.status !== "APPROVED" || !before.decidedById || !before.decidedAt)
    throw new ApiError("Only a Board-approved run can be posted once.", 409);
  if (before.decidedById === actor.id)
    throw new ApiError("Another Treasurer must post a run you approved.", 403);
  const shares = before.calculationSnapshot as unknown as DividendShare[];
  // Verify the stored proposal still reproduces the approved pool exactly.
  const expected = allocateDividends(
    shares,
    before.totalPoolAmount.toFixed(2),
    dateNumber(before.periodEnd.toISOString().slice(0, 10)) -
      dateNumber(before.periodStart.toISOString().slice(0, 10)) +
      1,
  );
  if (
    before.calculationMethod !== DIVIDEND_METHOD ||
    expected.length !== shares.length ||
    expected.some((row, index) =>
      Object.entries(row).some(
        ([key, value]) => shares[index][key as keyof DividendShare] !== value,
      ),
    )
  )
    throw new ApiError(
      "The dividend proposal is inconsistent. Contact an Administrator.",
      409,
    );
  const ids = shares.map((share) => share.savingsAccountId).sort();
  // Same account/member lock order as deposits and withdrawals; one ordered query
  // makes concurrent postings and savings writes serialize without lost updates.
  const accounts = await db.$queryRaw<
    {
      id: string;
      memberId: string;
      balance: Prisma.Decimal;
      status: string;
      memberStatus: string;
    }[]
  >(Prisma.sql`
    SELECT a.id, a."memberId", a.balance, a.status, m.status AS "memberStatus"
    FROM hlusca."SavingsAccount" a JOIN hlusca."Member" m ON m.id = a."memberId"
    WHERE a.id IN (${Prisma.join(ids)}) ORDER BY a.id FOR UPDATE OF a, m
  `);
  const byId = new Map(accounts.map((account) => [account.id, account]));
  const now = new Date();
  const allocations: Prisma.DividendAllocationCreateManyInput[] = [];
  const transactions: Prisma.TransactionCreateManyInput[] = [];
  const balances: { id: string; before: string; after: string }[] = [];
  for (const share of shares) {
    const account = byId.get(share.savingsAccountId);
    if (
      !account ||
      account.memberId !== share.memberId ||
      account.status !== "ACTIVE" ||
      account.memberStatus !== "ACTIVE"
    )
      throw new ApiError(
        "An approved recipient no longer has an active membership and savings account. Resolve the account status before posting.",
        409,
      );
    const after = account.balance.plus(share.amount);
    if (after.gte("10000000000000000"))
      throw new ApiError(
        "A recipient's savings balance would exceed the supported amount.",
        409,
      );
    const transactionId =
      minorUnits(share.amount) > BigInt("0") ? randomUUID() : null;
    allocations.push({
      id: randomUUID(),
      dividendRunId: id,
      memberId: share.memberId,
      savingsAccountId: share.savingsAccountId,
      amount: share.amount,
      averageBalance: share.averageBalance,
      transactionId,
    });
    if (transactionId) {
      transactions.push({
        id: transactionId,
        savingsAccountId: account.id,
        amount: share.amount,
        balanceAfter: after,
        type: "DIVIDEND",
        reference: `DIV-${id}`,
        narrative: `Financial year ${before.financialYear} dividend`,
        performedById: actor.id,
        createdAt: now,
      });
      balances.push({
        id: account.id,
        before: account.balance.toFixed(2),
        after: after.toFixed(2),
      });
    }
  }
  if (balances.length)
    await db.$executeRaw(Prisma.sql`
    UPDATE hlusca."SavingsAccount" a SET balance = v.balance
    FROM (VALUES ${Prisma.join(balances.map((row) => Prisma.sql`(${row.id}, ${row.after}::numeric)`))}) AS v(id, balance)
    WHERE a.id = v.id
  `);
  await db.transaction.createMany({ data: transactions });
  await db.dividendAllocation.createMany({ data: allocations });
  const result = await db.dividendRun.update({
    where: { id },
    data: { status: "POSTED", postedById: actor.id, postedAt: now },
  });
  return {
    result,
    entityId: id,
    beforeState: snapshot({
      run: before,
      balances: balances.map((row) => ({ id: row.id, balance: row.before })),
    }),
    afterState: snapshot({
      run: result,
      allocations,
      transactions,
      balances: balances.map((row) => ({ id: row.id, balance: row.after })),
    }),
  };
}
