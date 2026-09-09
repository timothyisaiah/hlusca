import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma, type UserRole } from "@prisma/client";

const session = vi.hoisted(() => ({
  user: null as null | { id: string; role: UserRole },
}));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () =>
    session.user ? { user: session.user } : null,
  ),
}));
vi.mock("../auth/options", () => ({ authOptions: {} }));
vi.mock("../db", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  return {
    prisma: new PrismaClient({
      adapter: new PrismaPg(
        process.env.INVESTMENT_TEST_DATABASE_URL ??
          "postgresql://postgres@127.0.0.1:55439/hlusca_investments_test",
        { schema: "hlusca" },
      ),
      transactionOptions: { maxWait: 10000, timeout: 15000 },
    }),
  };
});

import { prisma } from "../db";
import { hashPassword } from "../auth/passwords";
import { POST as createProduct } from "../../app/api/investment-products/route";
import { PATCH as editProduct } from "../../app/api/investment-products/[id]/route";
import {
  POST as invest,
  GET as investments,
} from "../../app/api/investments/route";
import { PATCH as closeInvestment } from "../../app/api/investments/[id]/route";
import {
  POST as propose,
  GET as runs,
} from "../../app/api/dividend-runs/route";
import { POST as approve } from "../../app/api/dividend-runs/[id]/approve/route";
import { POST as reject } from "../../app/api/dividend-runs/[id]/reject/route";
import { POST as post } from "../../app/api/dividend-runs/[id]/post/route";
import { GET as history } from "../../app/api/dividend-history/route";
import { proxy } from "../../proxy";
import type { DividendShare } from "./calculation";

const prefix = `investments-test-${randomUUID()}`;
const password = "InvestmentTestOnly123!";
let passwordHash: string;
let admin: { id: string; role: UserRole };
let treasurer: { id: string; role: UserRole };
let board: { id: string; role: UserRole };
let client: { id: string; role: UserRole; memberId: string; accountId: string };
let outsider: typeof client;
let productId: string;
let nextYear = 2001;
const product = {
  name: prefix,
  description: "Fixed term pilot investment",
  expectedReturnRate: "12.5",
  riskProfile: "LOW",
  active: true,
};
type Handler = typeof propose;

async function call(
  handler: Handler,
  body: unknown,
  id = "",
  raw?: string,
  headers = {},
) {
  const count = await prisma.auditLog.count();
  const response = await handler(
    new NextRequest(`http://localhost:3000/api/test/${id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
        ...headers,
      },
      body: raw ?? JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
  expect(await prisma.auditLog.count()).toBe(count + 1);
  return response;
}
async function read(handler: typeof runs, query = "") {
  return handler(new NextRequest(`http://localhost:3000/api/test${query}`), {});
}
async function staff(role: UserRole) {
  return prisma.user.create({
    data: {
      username: `${prefix}-${role}-${randomUUID()}`,
      passwordHash,
      role,
      mustChangePassword: false,
    },
  });
}
async function member() {
  const id = randomUUID();
  const row = await prisma.member.create({
    data: {
      memberNumber: `TEST-${id}`,
      firstName: "Amina",
      lastName: "Test",
      nationalIdNumber: id,
      address: "Test",
      phone: "+256700000001",
      nextOfKinName: "Kin",
      nextOfKinPhone: "+256700000002",
      status: "ACTIVE",
      savingsAccount: {
        create: {
          accountNumber: id,
          balance: "100",
          openedAt: new Date("2000-01-01"),
        },
      },
      user: {
        create: {
          username: `${prefix}-${id}`,
          passwordHash,
          role: "CLIENT",
          mustChangePassword: false,
        },
      },
    },
    include: { user: true, savingsAccount: true },
  });
  await prisma.transaction.create({
    data: {
      savingsAccountId: row.savingsAccount!.id,
      amount: "100",
      balanceAfter: "100",
      type: "DEPOSIT",
      performedById: treasurer.id,
      createdAt: new Date("2000-01-01"),
    },
  });
  return {
    id: row.user!.id,
    role: "CLIENT" as const,
    memberId: row.id,
    accountId: row.savingsAccount!.id,
  };
}
async function proposal(pool = "100.01") {
  session.user = treasurer;
  // Keep each invocation repeatable without deleting financial/audit records.
  while (
    await prisma.dividendRun.findFirst({ where: { financialYear: nextYear } })
  )
    nextYear++;
  const financialYear = nextYear++;
  const input = {
    financialYear,
    periodStart: `${financialYear}-01-01`,
    periodEnd: `${financialYear}-12-31`,
    totalPoolAmount: pool,
  };
  const response = await call(propose, input);
  expect(response.status, await response.clone().text()).toBe(200);
  return { ...(await response.json()), input };
}
async function approved() {
  const run = await proposal();
  session.user = board;
  expect(
    (await call(approve, { comment: "Board reviewed allocations" }, run.id))
      .status,
  ).toBe(200);
  return run;
}

describe.skipIf(!process.env.INVESTMENT_TEST_DATABASE_URL)(
  "investments and dividends against disposable PostgreSQL",
  () => {
    beforeAll(async () => {
      const url = new URL(process.env.INVESTMENT_TEST_DATABASE_URL!);
      if (
        !["127.0.0.1", "localhost"].includes(url.hostname) ||
        url.pathname !== "/hlusca_investments_test"
      )
        throw new Error(
          "A disposable local hlusca_investments_test database is required.",
        );
      passwordHash = await hashPassword(password);
      admin = await staff("ADMIN");
      treasurer = await staff("TREASURER");
      board = await staff("BOARD");
      client = await member();
      outsider = await member();
      session.user = admin;
      const response = await call(createProduct, product);
      expect(response.status).toBe(200);
      productId = (await response.json()).id;
    }, 30000);
    afterAll(async () => {
      await prisma.$disconnect();
    });

    it("configures products, preserves investment terms, and scopes member holdings", async () => {
      session.user = admin;
      const response = await call(invest, {
        memberId: client.memberId,
        investmentProductId: productId,
        principal: "1234.56",
        startDate: "2020-01-01",
        maturityDate: "2021-01-01",
      });
      expect(response.status).toBe(200);
      const investment = await response.json();
      expect(
        (
          await call(
            editProduct,
            { ...product, expectedReturnRate: "15", active: false },
            productId,
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await prisma.memberInvestment.findUniqueOrThrow({
            where: { id: investment.id },
          })
        ).expectedReturnRate.toString(),
      ).toBe("12.5");
      expect(
        (
          await call(invest, {
            memberId: client.memberId,
            investmentProductId: productId,
            principal: "100",
            startDate: "2020-01-01",
            maturityDate: "2021-01-01",
          })
        ).status,
      ).toBe(409);
      session.user = outsider;
      expect(await (await read(investments)).json()).toEqual([]);
      expect(
        (await read(investments, `?memberId=${client.memberId}`)).status,
      ).toBe(403);
      session.user = client;
      expect(
        (await (await read(investments)).json()).map(
          (row: { id: string }) => row.id,
        ),
      ).toContain(investment.id);
      session.user = admin;
      expect(
        (await call(closeInvestment, { status: "MATURED" }, investment.id))
          .status,
      ).toBe(200);
      expect(
        (await call(closeInvestment, { status: "CANCELLED" }, investment.id))
          .status,
      ).toBe(409);
    });

    it("requires Board approval, posts exact amounts once, and exposes only owned history", async () => {
      const run = await proposal();
      expect(
        (await call(post, { password, confirm: true }, run.id)).status,
      ).toBe(409);
      expect(
        await prisma.dividendAllocation.count({
          where: { dividendRunId: run.id },
        }),
      ).toBe(0);
      session.user = board;
      expect(
        (
          await call(
            approve,
            { comment: "Approved pool and member shares" },
            run.id,
          )
        ).status,
      ).toBe(200);
      const before = await prisma.savingsAccount.findUniqueOrThrow({
        where: { id: client.accountId },
      });
      session.user = treasurer;
      expect(
        (await call(post, { password: "wrong", confirm: true }, run.id)).status,
      ).toBe(403);
      expect(
        (await call(post, { password, confirm: true }, run.id)).status,
      ).toBe(200);
      const allocations = await prisma.dividendAllocation.findMany({
        where: { dividendRunId: run.id },
        include: { transaction: true },
      });
      expect(
        allocations
          .reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0))
          .toFixed(2),
      ).toBe("100.01");
      const own = allocations.find((row) => row.memberId === client.memberId)!;
      expect(own.transaction!.type).toBe("DIVIDEND");
      expect(own.transaction!.amount.toFixed(2)).toBe(own.amount.toFixed(2));
      expect(
        (
          await prisma.savingsAccount.findUniqueOrThrow({
            where: { id: client.accountId },
          })
        ).balance.toFixed(2),
      ).toBe(before.balance.plus(own.amount).toFixed(2));
      expect(
        (await call(post, { password, confirm: true }, run.id)).status,
      ).toBe(409);
      session.user = client;
      expect(
        (await (await read(history)).json()).map(
          (row: { id: string }) => row.id,
        ),
      ).toContain(own.id);
      expect(
        (await read(history, `?memberId=${outsider.memberId}`)).status,
      ).toBe(403);
      expect((await read(runs)).status).toBe(403);
    });

    it("rejects overlaps and supports replacing a rejected proposal", async () => {
      const run = await proposal();
      expect((await call(propose, run.input)).status).toBe(409);
      const year = run.financialYear + 1;
      expect(
        (
          await call(propose, {
            ...run.input,
            financialYear: year,
            periodStart: `${year - 1}-07-01`,
            periodEnd: `${year}-06-30`,
          })
        ).status,
      ).toBe(409);
      session.user = board;
      expect(
        (await call(reject, { comment: "Revise the pool" }, run.id)).status,
      ).toBe(200);
      session.user = treasurer;
      expect(
        (await call(propose, { ...run.input, totalPoolAmount: "200" })).status,
      ).toBe(200);
      expect(
        (await call(post, { password, confirm: true }, run.id)).status,
      ).not.toBe(200);
    });

    it("freezes the proposal through later savings movements and prevents tampering", async () => {
      const run = await approved();
      await expect(
        prisma.dividendRun.update({
          where: { id: run.id },
          data: { totalPoolAmount: "999" },
        }),
      ).rejects.toThrow();
      const before = await prisma.savingsAccount.findUniqueOrThrow({
        where: { id: client.accountId },
      });
      await prisma.$transaction(async (tx) => {
        await tx.savingsAccount.update({
          where: { id: client.accountId },
          data: { balance: { increment: "1000" } },
        });
        await tx.transaction.create({
          data: {
            savingsAccountId: client.accountId,
            type: "DEPOSIT",
            amount: "1000",
            balanceAfter: before.balance.plus(1000),
            performedById: treasurer.id,
          },
        });
      });
      session.user = await staff("TREASURER"); // independent posting actor, fresh step-up quota
      expect(
        (await call(post, { password, confirm: true }, run.id)).status,
      ).toBe(200);
      const own = (run.calculationSnapshot as DividendShare[]).find(
        (row) => row.memberId === client.memberId,
      )!;
      expect(
        (
          await prisma.dividendAllocation.findUniqueOrThrow({
            where: {
              dividendRunId_memberId: {
                dividendRunId: run.id,
                memberId: client.memberId,
              },
            },
          })
        ).amount.toFixed(2),
      ).toBe(own.amount);
    });

    it("rolls back all balances and ledger rows when a recipient is suspended", async () => {
      const run = await approved();
      await prisma.savingsAccount.update({
        where: { id: outsider.accountId },
        data: { status: "SUSPENDED" },
      });
      const balance = (
        await prisma.savingsAccount.findUniqueOrThrow({
          where: { id: client.accountId },
        })
      ).balance.toFixed(2);
      session.user = await staff("TREASURER");
      expect(
        (await call(post, { password, confirm: true }, run.id)).status,
      ).toBe(409);
      expect(
        await prisma.dividendAllocation.count({
          where: { dividendRunId: run.id },
        }),
      ).toBe(0);
      expect(
        await prisma.transaction.count({
          where: { reference: `DIV-${run.id}` },
        }),
      ).toBe(0);
      expect(
        (
          await prisma.savingsAccount.findUniqueOrThrow({
            where: { id: client.accountId },
          })
        ).balance.toFixed(2),
      ).toBe(balance);
      expect(
        (await prisma.dividendRun.findUniqueOrThrow({ where: { id: run.id } }))
          .status,
      ).toBe("APPROVED");
      await prisma.savingsAccount.update({
        where: { id: outsider.accountId },
        data: { status: "ACTIVE" },
      });
    });

    it("serializes concurrent posting so only one request credits members", async () => {
      const run = await approved();
      session.user = await staff("TREASURER");
      const count = await prisma.auditLog.count();
      const invoke = () =>
        post(
          new NextRequest("http://localhost:3000/api/test", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ password, confirm: true }),
          }),
          { params: Promise.resolve({ id: run.id }) },
        );
      const responses = await Promise.all([invoke(), invoke()]);
      expect(responses.map((response) => response.status).sort()).toEqual([
        200, 409,
      ]);
      expect(await prisma.auditLog.count()).toBe(count + 2);
      expect(
        await prisma.dividendAllocation.count({
          where: { dividendRunId: run.id },
        }),
      ).toBe(run.calculationSnapshot.length);
    });

    it("rolls back the complete payout if its success audit cannot be written", async () => {
      const run = await approved();
      const before = await prisma.savingsAccount.findMany({
        orderBy: { id: "asc" },
        select: { id: true, balance: true },
      });
      await prisma.$executeRawUnsafe(
        `CREATE FUNCTION hlusca.fail_dividend_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."entityType" = 'DividendRun' AND NEW.action = 'DISBURSE' AND NEW.status = 'SUCCESS' THEN RAISE EXCEPTION 'Injected dividend audit failure'; END IF; RETURN NEW; END $$`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE TRIGGER fail_dividend_test_audit BEFORE INSERT ON hlusca."AuditLog" FOR EACH ROW EXECUTE FUNCTION hlusca.fail_dividend_test_audit()`,
      );
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      try {
        session.user = await staff("TREASURER");
        expect(
          (await call(post, { password, confirm: true }, run.id)).status,
        ).toBe(500);
        expect(
          await prisma.savingsAccount.findMany({
            orderBy: { id: "asc" },
            select: { id: true, balance: true },
          }),
        ).toEqual(before);
        expect(
          await prisma.dividendAllocation.count({
            where: { dividendRunId: run.id },
          }),
        ).toBe(0);
        expect(
          await prisma.transaction.count({
            where: { reference: `DIV-${run.id}` },
          }),
        ).toBe(0);
        expect(
          (
            await prisma.dividendRun.findUniqueOrThrow({
              where: { id: run.id },
            })
          ).status,
        ).toBe("APPROVED");
        const audit = await prisma.auditLog.findFirstOrThrow({
          where: { entityId: run.id, action: "DISBURSE" },
        });
        expect(audit.status).toBe("FAILURE");
        expect(JSON.stringify(audit)).not.toContain(password);
      } finally {
        consoleError.mockRestore();
        await prisma.$executeRawUnsafe(
          `DROP TRIGGER fail_dividend_test_audit ON hlusca."AuditLog"`,
        );
        await prisma.$executeRawUnsafe(
          `DROP FUNCTION hlusca.fail_dividend_test_audit()`,
        );
      }
    });

    it("uses Kampala day boundaries in the real ledger and excludes next-year movements", async () => {
      while (
        await prisma.dividendRun.findFirst({
          where: { financialYear: nextYear },
        })
      )
        nextYear++;
      const year = nextYear;
      const periodDays =
        (Date.parse(`${year + 1}-01-01`) - Date.parse(`${year}-01-01`)) /
        86400000;
      const accountBefore = await prisma.savingsAccount.findUniqueOrThrow({
        where: { id: client.accountId },
      });
      await prisma.transaction.createMany({
        data: [
          {
            savingsAccountId: client.accountId,
            type: "DEPOSIT",
            amount: "10",
            balanceAfter: accountBefore.balance.plus(10),
            performedById: treasurer.id,
            createdAt: new Date(`${year}-12-30T21:00:00Z`),
          },
          {
            savingsAccountId: client.accountId,
            type: "DEPOSIT",
            amount: "1000",
            balanceAfter: accountBefore.balance.plus(1010),
            performedById: treasurer.id,
            createdAt: new Date(`${year}-12-31T21:00:00Z`),
          },
        ],
      });
      await prisma.savingsAccount.update({
        where: { id: client.accountId },
        data: { balance: { increment: "1010" } },
      });
      const run = await proposal();
      const own = (run.calculationSnapshot as DividendShare[]).find(
        (row) => row.memberId === client.memberId,
      )!;
      expect(own.balanceDaysMinor).toBe(String(10000 * periodDays + 1000));
    });

    it("requires separate people even if roles change between proposal, approval and posting", async () => {
      const run = await proposal();
      await prisma.user.update({
        where: { id: treasurer.id },
        data: { role: "BOARD" },
      });
      session.user = treasurer; // stale session: database role is authoritative
      expect(
        (await call(approve, { comment: "Attempt self approval" }, run.id))
          .status,
      ).toBe(403);
      await prisma.user.update({
        where: { id: treasurer.id },
        data: { role: "TREASURER" },
      });
      session.user = board;
      expect(
        (await call(approve, { comment: "Independent review" }, run.id)).status,
      ).toBe(200);
      await prisma.user.update({
        where: { id: board.id },
        data: { role: "TREASURER" },
      });
      expect(
        (await call(post, { password, confirm: true }, run.id)).status,
      ).toBe(403);
      await prisma.user.update({
        where: { id: board.id },
        data: { role: "BOARD" },
      });
    });

    it("audits forbidden roles, malformed bodies, CSRF and unauthenticated attempts", async () => {
      for (const actor of [client, board, admin]) {
        session.user = actor;
        expect((await call(propose, {})).status).toBe(403);
      }
      for (const actor of [client, treasurer, board]) {
        session.user = actor;
        expect((await call(createProduct, product)).status).toBe(403);
      }
      session.user = treasurer;
      expect((await call(propose, {}, "", "{")).status).toBe(400);
      expect(
        (
          await call(propose, {}, "", undefined, {
            origin: "https://evil.example",
          })
        ).status,
      ).toBe(403);
      session.user = null;
      expect((await call(propose, {})).status).toBe(401);
      const response = await proxy(
        new NextRequest("http://localhost:3000/api/dividend-runs", {
          method: "POST",
        }),
      );
      expect(response.headers.get("x-middleware-next")).toBe("1");
    });
  },
);
