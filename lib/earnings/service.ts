import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { z } from "zod";

import { ApiError } from "../api";
import { verifyPassword } from "../auth/passwords";
import {
  DATABASE_SCHEMA,
  DEFAULT_MEMBER_EARNINGS_SHARE_PERCENT,
  SYSTEM_SETTING_KEYS,
} from "../constants";
import { prisma } from "../db";
import { dateNumber } from "../investments/calculation";
import { businessDate } from "../loans/reconciliation";
import { assertLoanRole, snapshot, type LoanActor } from "../loans/service";
import { setSystemSetting } from "../system-settings";
import { formatMonth as monthLabel } from "../utils";
import {
  allocateEarnings,
  attributeCollectedInterest,
  dailyInterestSchedule,
  dailyMinimumBalances,
  dayString,
  EARNINGS_METHOD,
  memberPoolMinor,
  minorUnits,
  money,
  type LedgerEntry,
} from "./calculation";
import type { earningsPostSchema, earningsRunSchema } from "./schemas";
import type {
  EarningsHistoryRecord,
  EarningsRunRecord,
  EarningsSnapshot,
  EarningsSnapshotShare,
  MemberEarningsSummary,
} from "./types";

type Db = Prisma.TransactionClient;

const ZERO = BigInt(0);
const staffRoles = ["TREASURER", "BOARD", "ADMIN"] as const;
const table = (name: string) => Prisma.raw(`"${DATABASE_SCHEMA}"."${name}"`);
const serialize = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
const toMinor = (value: Prisma.Decimal | string) =>
  minorUnits(typeof value === "string" ? value : value.toFixed(2));

/** Kampala midnight at the end of `date`, as a UTC instant. */
const endOfKampalaDay = (date: string) =>
  new Date(`${dayString(dateNumber(date) + 1)}T00:00:00+03:00`);

function lastDayOfMonth(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthIndex, 0)).toISOString().slice(0, 10);
}

function scope(actor: LoanActor, memberId?: string) {
  if (actor.role === "CLIENT") {
    if (!actor.memberId || (memberId && memberId !== actor.memberId))
      throw new ApiError("Forbidden.", 403);
    return actor.memberId;
  }
  assertLoanRole(actor, [...staffRoles]);
  return memberId;
}

export async function getEarningsSharePercent(db: Db = prisma) {
  const setting = await db.systemSetting.findUnique({
    where: { key: SYSTEM_SETTING_KEYS.MEMBER_EARNINGS_SHARE_PERCENT },
  });
  const value = setting?.value ?? DEFAULT_MEMBER_EARNINGS_SHARE_PERCENT;
  // Fail closed on a corrupted setting rather than paying out a wrong share.
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value) || Number(value) > 100)
    throw new ApiError(
      "Configure a valid member earnings share before running earnings.",
      409,
    );
  return value;
}

export async function saveEarningsSharePercent(
  db: Db,
  actor: LoanActor,
  memberSharePercent: string,
) {
  assertLoanRole(actor, ["ADMIN"]);
  const key = SYSTEM_SETTING_KEYS.MEMBER_EARNINGS_SHARE_PERCENT;
  const before = await db.systemSetting.findUnique({ where: { key } });
  const setting = await setSystemSetting(key, memberSharePercent, actor.id, db);
  return {
    result: { memberSharePercent },
    entityId: key,
    beforeState: before ? snapshot(before) : undefined,
    afterState: snapshot(setting),
  };
}

/**
 * Works out what a run through `through` would share: newly collected loan
 * interest (capped at accrued days), attributed to its days, split by each
 * day's lowest member balances. Read-only; used by proposals and estimates.
 */
export async function calculateEarnings(
  db: Db,
  through: string,
  sharePercent: string,
) {
  const cutoff = endOfKampalaDay(through);

  const [loans, recognizedRows, accounts, ledger] = await Promise.all([
    db.loan.findMany({
      where: { disbursementDate: { lt: cutoff } },
      select: {
        id: true,
        disbursementDate: true,
        member: { select: { memberNumber: true } },
        schedule: {
          select: { dueDate: true, interestDue: true, interestPaid: true },
          orderBy: { installmentNumber: "asc" },
        },
      },
      orderBy: { id: "asc" },
    }),
    db.$queryRaw<{ loanId: string; recognized: string }[]>(Prisma.sql`
      SELECT rl."loanId", SUM(rl."interestRecognized")::text AS recognized
      FROM ${table("EarningsRunLoan")} rl
      JOIN ${table("EarningsRun")} r ON r."id" = rl."runId"
      WHERE r."status" = 'POSTED'
      GROUP BY rl."loanId"
    `),
    db.savingsAccount.findMany({
      select: {
        id: true,
        status: true,
        member: {
          select: { id: true, memberNumber: true, firstName: true, lastName: true },
        },
      },
      orderBy: { id: "asc" },
    }),
    db.$queryRaw<{ savingsAccountId: string; date: string; balance: string }[]>(
      Prisma.sql`
        SELECT "savingsAccountId",
          (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Kampala')::date::text AS date,
          "balanceAfter"::text AS balance
        FROM ${table("Transaction")}
        WHERE "createdAt" < ${cutoff}
        ORDER BY "savingsAccountId", "createdAt", "id"
      `,
    ),
  ]);

  const recognized = new Map(
    recognizedRows.map((row) => [row.loanId, minorUnits(row.recognized)]),
  );
  const dayIncome = new Map<number, bigint>();
  const loanShares: EarningsSnapshot["loans"] = [];
  let collected = ZERO;

  for (const loan of loans) {
    const schedule = dailyInterestSchedule(
      businessDate(loan.disbursementDate),
      loan.schedule.map((row) => ({
        dueDate: row.dueDate.toISOString().slice(0, 10),
        interestMinor: toMinor(row.interestDue),
      })),
    );
    const paid = loan.schedule.reduce(
      (sum, row) => sum + toMinor(row.interestPaid),
      ZERO,
    );
    const { delta, days } = attributeCollectedInterest(
      schedule,
      paid,
      recognized.get(loan.id) ?? ZERO,
      through,
    );
    if (delta === ZERO) continue;
    collected += delta;
    loanShares.push({
      loanId: loan.id,
      memberNumber: loan.member.memberNumber,
      interest: money(delta),
    });
    for (const [day, minor] of days)
      dayIncome.set(day, (dayIncome.get(day) ?? ZERO) + minor);
  }

  const entriesByAccount = new Map<string, LedgerEntry[]>();
  for (const row of ledger) {
    const entries = entriesByAccount.get(row.savingsAccountId) ?? [];
    entries.push({ day: dateNumber(row.date), balanceAfterMinor: minorUnits(row.balance) });
    entriesByAccount.set(row.savingsAccountId, entries);
  }

  let pool = memberPoolMinor(collected, sharePercent);
  const shares = allocateEarnings(
    dayIncome,
    accounts.map((account) => ({
      memberId: account.member.id,
      savingsAccountId: account.id,
      memberNumber: account.member.memberNumber,
      memberName: `${account.member.firstName} ${account.member.lastName}`,
      minimumOn: dailyMinimumBalances(entriesByAccount.get(account.id) ?? []),
    })),
    pool,
  ).filter((share) => share.amount !== "0.00");
  // Nobody held savings on any income day: the whole amount is retained.
  if (!shares.length) pool = ZERO;

  const active = new Set(
    accounts.filter((account) => account.status === "ACTIVE").map((account) => account.id),
  );
  const incomeDays = [...dayIncome.keys()].sort((a, b) => a - b);

  return {
    collected,
    pool,
    reserve: collected - pool,
    loans: loanShares,
    snapshot: {
      method: EARNINGS_METHOD,
      firstDay: incomeDays.length ? dayString(incomeDays[0]) : null,
      lastDay: incomeDays.length ? dayString(incomeDays[incomeDays.length - 1]) : null,
      shares: shares.map((share) => ({
        ...share,
        accountActive: active.has(share.savingsAccountId),
      })),
      loans: loanShares,
    } satisfies EarningsSnapshot,
  };
}

async function latestPostedMonth(db: Db) {
  const latest = await db.earningsRun.findFirst({
    where: { status: "POSTED" },
    orderBy: { month: "desc" },
    select: { month: true },
  });
  return latest?.month ?? null;
}

export async function proposeEarningsRun(
  db: Db,
  actor: LoanActor,
  input: z.infer<typeof earningsRunSchema>,
) {
  assertLoanRole(actor, ["TREASURER"]);
  const periodEnd = lastDayOfMonth(input.month);
  if (periodEnd >= businessDate())
    throw new ApiError("Only a completed month can be calculated.");

  // Serialize proposals; the partial unique indexes are the final guard.
  await db.$executeRaw`SELECT pg_advisory_xact_lock(68451207)`;
  const open = await db.earningsRun.findFirst({ where: { status: "PROPOSED" } });
  if (open)
    throw new ApiError(
      `The ${monthLabel(open.month)} proposal is still open. Post or cancel it first.`,
      409,
    );
  const latest = await latestPostedMonth(db);
  if (latest && latest >= input.month)
    throw new ApiError(
      `Earnings through ${monthLabel(latest)} are already posted. Choose a later month.`,
      409,
    );

  const sharePercent = await getEarningsSharePercent(db);
  const calculation = await calculateEarnings(db, periodEnd, sharePercent);
  if (calculation.collected === ZERO)
    throw new ApiError(
      `No newly collected loan interest to share through ${monthLabel(input.month)}.`,
      409,
    );

  const result = await db.earningsRun.create({
    data: {
      month: input.month,
      periodEnd: new Date(`${periodEnd}T00:00:00Z`),
      interestCollected: money(calculation.collected),
      memberSharePercent: sharePercent,
      memberPool: money(calculation.pool),
      reserveAmount: money(calculation.reserve),
      calculationMethod: EARNINGS_METHOD,
      calculationSnapshot: snapshot(calculation.snapshot),
      proposedById: actor.id,
      loans: {
        createMany: {
          data: calculation.loans.map((loan) => ({
            loanId: loan.loanId,
            interestRecognized: loan.interest,
          })),
        },
      },
    },
  });

  return { result, entityId: result.id, afterState: snapshot(result) };
}

async function lockedRun(db: Db, id: string) {
  await db.$queryRaw(Prisma.sql`
    SELECT "id" FROM ${table("EarningsRun")} WHERE "id" = ${id} FOR UPDATE
  `);
  const run = await db.earningsRun.findUnique({ where: { id } });
  if (!run) throw new ApiError("Earnings run not found.", 404);
  return run;
}

export async function cancelEarningsRun(db: Db, actor: LoanActor, id: string) {
  assertLoanRole(actor, ["TREASURER"]);
  const before = await lockedRun(db, id);
  if (before.status !== "PROPOSED")
    throw new ApiError("Only an open proposal can be cancelled.", 409);
  const result = await db.earningsRun.update({
    where: { id },
    data: { status: "CANCELLED", cancelledById: actor.id, cancelledAt: new Date() },
  });
  return {
    result,
    entityId: id,
    beforeState: snapshot({ status: before.status }),
    afterState: snapshot({ status: result.status }),
  };
}

export async function postEarningsRun(
  db: Db,
  actor: LoanActor,
  id: string,
  input: z.infer<typeof earningsPostSchema>,
) {
  assertLoanRole(actor, ["TREASURER"]);
  const failures = await db.auditLog.count({
    where: {
      actorId: actor.id,
      entityType: "EarningsRun",
      status: "FAILURE",
      createdAt: { gte: new Date(Date.now() - 10 * 60_000) },
    },
  });
  if (failures >= 5)
    throw new ApiError("Too many failed attempts. Try again in ten minutes.", 429);
  const user = await db.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: { passwordHash: true },
  });
  if (!(await verifyPassword(input.password, user.passwordHash)))
    throw new ApiError("Password confirmation failed.", 403);

  const before = await lockedRun(db, id);
  if (before.status !== "PROPOSED")
    throw new ApiError("Only an open proposal can be posted, and only once.", 409);
  const latest = await latestPostedMonth(db);
  if (latest && latest >= before.month)
    throw new ApiError("A later month has already been posted. Cancel this proposal.", 409);

  const frozen = before.calculationSnapshot as unknown as EarningsSnapshot;
  const shares = frozen.shares;
  const total = shares.reduce((sum, share) => sum + minorUnits(share.amount), ZERO);
  if (frozen.method !== EARNINGS_METHOD || total !== toMinor(before.memberPool))
    throw new ApiError(
      "The earnings proposal is inconsistent. Cancel it and calculate again.",
      409,
    );

  // Same account/member lock order as deposits, withdrawals and dividends.
  const accounts = shares.length
    ? await db.$queryRaw<
        { id: string; memberId: string; balance: Prisma.Decimal; status: string }[]
      >(Prisma.sql`
        SELECT a."id", a."memberId", a."balance", a."status"
        FROM ${table("SavingsAccount")} a
        JOIN ${table("Member")} m ON m."id" = a."memberId"
        WHERE a."id" IN (${Prisma.join(shares.map((share) => share.savingsAccountId).sort())})
        ORDER BY a."id"
        FOR UPDATE OF a, m
      `)
    : [];
  const byId = new Map(accounts.map((account) => [account.id, account]));

  const now = new Date();
  const label = monthLabel(before.month);
  const allocations: Prisma.EarningsAllocationCreateManyInput[] = [];
  const transactions: Prisma.TransactionCreateManyInput[] = [];
  const balances: { id: string; before: string; after: string }[] = [];
  const credited: string[] = [];
  let forfeited = ZERO;

  for (const share of shares) {
    const account = byId.get(share.savingsAccountId);
    if (!account || account.memberId !== share.memberId)
      throw new ApiError("An earnings recipient's savings account is missing.", 409);
    // Decision #7: only active savings accounts are credited; the rest is retained.
    if (account.status !== "ACTIVE") {
      forfeited += minorUnits(share.amount);
      allocations.push({
        id: randomUUID(),
        runId: id,
        memberId: share.memberId,
        savingsAccountId: share.savingsAccountId,
        amount: share.amount,
        earningDays: share.earningDays,
        forfeited: true,
      });
      continue;
    }
    const after = new Prisma.Decimal(account.balance).plus(share.amount);
    const transactionId = randomUUID();
    transactions.push({
      id: transactionId,
      savingsAccountId: account.id,
      type: "INTEREST",
      amount: share.amount,
      balanceAfter: after,
      reference: `ERN-${before.month}`,
      narrative: `Loan interest earnings for ${label}`,
      performedById: actor.id,
      createdAt: now,
    });
    allocations.push({
      id: randomUUID(),
      runId: id,
      memberId: share.memberId,
      savingsAccountId: share.savingsAccountId,
      amount: share.amount,
      earningDays: share.earningDays,
      transactionId,
    });
    balances.push({
      id: account.id,
      before: new Prisma.Decimal(account.balance).toFixed(2),
      after: after.toFixed(2),
    });
    credited.push(share.memberId);
  }

  if (balances.length)
    await db.$executeRaw(Prisma.sql`
      UPDATE ${table("SavingsAccount")} a SET "balance" = v.balance
      FROM (VALUES ${Prisma.join(balances.map((row) => Prisma.sql`(${row.id}, ${row.after}::numeric)`))}) AS v(id, balance)
      WHERE a."id" = v.id
    `);
  if (transactions.length) await db.transaction.createMany({ data: transactions });
  if (allocations.length) await db.earningsAllocation.createMany({ data: allocations });

  if (credited.length) {
    const users = await db.user.findMany({
      where: { memberId: { in: credited } },
      select: { id: true, memberId: true },
    });
    const amounts = new Map(shares.map((share) => [share.memberId, share.amount]));
    await db.notification.createMany({
      data: users.map((recipient) => ({
        userId: recipient.id,
        type: "SYSTEM" as const,
        message: `Your loan interest earnings for ${label} (UGX ${amounts.get(recipient.memberId ?? "")}) have been credited to your savings.`,
      })),
    });
  }

  const result = await db.earningsRun.update({
    where: { id },
    data: {
      status: "POSTED",
      postedById: actor.id,
      postedAt: now,
      forfeitedAmount: money(forfeited),
    },
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

export async function listEarningsRuns(
  actor: LoanActor,
  db: Db = prisma,
): Promise<EarningsRunRecord[]> {
  assertLoanRole(actor, [...staffRoles]);
  return serialize(
    await db.earningsRun.findMany({
      include: {
        proposedBy: { select: { username: true } },
        postedBy: { select: { username: true } },
      },
      orderBy: [{ month: "desc" }, { proposedAt: "desc" }],
      take: 60,
    }),
  );
}

export async function earningsHistory(
  actor: LoanActor,
  memberId?: string,
  db: Db = prisma,
): Promise<EarningsHistoryRecord[]> {
  return serialize(
    await db.earningsAllocation.findMany({
      where: {
        memberId: scope(actor, memberId),
        forfeited: false,
        transactionId: { not: null },
        run: { status: "POSTED" },
      },
      select: {
        id: true,
        amount: true,
        earningDays: true,
        run: { select: { month: true, periodEnd: true, postedAt: true } },
      },
      orderBy: { run: { month: "desc" } },
    }),
  );
}

export async function memberEarningsSummary(
  actor: LoanActor,
): Promise<MemberEarningsSummary> {
  const memberId = scope(actor);
  if (!memberId) throw new ApiError("A member account is required.", 403);
  const history = await earningsHistory(actor);
  const year = businessDate().slice(0, 4);
  const yearToDate = history
    .filter((row) => row.run.postedAt && businessDate(new Date(row.run.postedAt)).startsWith(year))
    .reduce((sum, row) => sum + minorUnits(row.amount), ZERO);

  let accruing: string | null = null;
  try {
    // Everything collected up to yesterday that is not yet in a posted run.
    const yesterday = dayString(dateNumber(businessDate()) - 1);
    const calculation = await calculateEarnings(
      prisma,
      yesterday,
      await getEarningsSharePercent(),
    );
    accruing =
      calculation.snapshot.shares.find((share) => share.memberId === memberId)
        ?.amount ?? "0.00";
  } catch (error) {
    console.error("Could not estimate accruing member earnings.", error);
  }

  return { yearToDate: money(yearToDate), accruing, history };
}

export type { EarningsSnapshotShare };
