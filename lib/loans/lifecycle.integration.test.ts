import { randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
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
        process.env.LOAN_TEST_DATABASE_URL ??
          "postgresql://postgres@127.0.0.1:55439/hlusca_loans_test",
        { schema: "hlusca" },
      ),
      transactionOptions: { maxWait: 10000, timeout: 15000 },
    }),
  };
});

import { prisma } from "../db";
import { hashPassword } from "../auth/passwords";
import { signatureFixture } from "./test-fixtures";
import { POST as submit } from "../../app/api/loan-applications/route";
import { POST as approve } from "../../app/api/loan-applications/[id]/approve/route";
import { POST as reject } from "../../app/api/loan-applications/[id]/reject/route";
import { POST as sign } from "../../app/api/contracts/[id]/sign/route";
import { POST as disburse } from "../../app/api/loan-applications/[id]/disburse/route";
import { POST as createType } from "../../app/api/loan-types/route";
import { PATCH as updateType } from "../../app/api/loan-types/[id]/route";
import { PATCH as updateThreshold } from "../../app/api/loan-settings/route";
import { GET as list } from "../../app/api/loan-applications/route";
import { GET as document } from "../../app/api/contracts/[id]/document/route";
import { GET as schedule } from "../../app/api/loans/[id]/schedule/route";
import { GET as signatureImage } from "../../app/api/contracts/[id]/signature/route";
import { GET as exportApplications } from "../../app/api/loan-applications/export/route";
import { POST as repay } from "../../app/api/loans/[id]/payments/route";
import { GET as statement } from "../../app/api/loans/[id]/statement/route";
import { GET as overdue } from "../../app/api/cron/loans/overdue/route";
import { businessDate } from "./reconciliation";
import type { LoanStatement } from "./statement-types";
import { proxy } from "../../proxy";

type Handler = typeof submit;
const prefix = `loans-test-${randomUUID()}`;
const password = "TestOnlyPassword123!";
let passwordHash: string;
let admin: { id: string; role: UserRole };
let treasurer: { id: string; role: UserRole };
let board: { id: string; role: UserRole };
let client: { id: string; role: UserRole; memberId: string };
let outsider: { id: string; role: UserRole; memberId: string };
let typeId: string;
const typeInput = {
  name: `${prefix}-product`,
  interestRate: "12",
  interestMethod: "FLAT",
  maxTermMonths: 24,
  maxMultipleOfSavings: "5",
  processingFeePercent: "2.5",
  active: true,
};

async function call(handler: Handler, body: unknown, id = "", raw?: string) {
  const request = new NextRequest(`http://localhost:3000/api/test/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost:3000",
      "x-forwarded-for": "127.0.0.7",
      "user-agent": "Loan lifecycle test",
    },
    body: raw ?? JSON.stringify(body),
  });
  // Next passes no params for static routes; dynamic routes receive a promise.
  return handler(request, id ? { params: Promise.resolve({ id }) } : {});
}
async function read(handler: typeof list, id = "", query = "") {
  return handler(
    new NextRequest(`http://localhost:3000/api/test${query}`),
    id ? { params: Promise.resolve({ id }) } : {},
  );
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
  const member = await prisma.member.create({
    data: {
      memberNumber: `TEST-${id}`,
      firstName: "Rose",
      lastName: "Ayo",
      nationalIdNumber: id,
      address: "Test address",
      phone: "+256700000001",
      nextOfKinName: "Test Kin",
      nextOfKinPhone: "+256700000002",
      status: "ACTIVE",
      user: {
        create: {
          username: `${prefix}-${id}`,
          passwordHash,
          role: "CLIENT",
          mustChangePassword: false,
        },
      },
      savingsAccount: {
        create: { accountNumber: `TEST-${id}`, balance: "2000000" },
      },
    },
    include: { user: true },
  });
  return { id: member.user!.id, role: "CLIENT" as const, memberId: member.id };
}
async function application(amount = "1000000", actor = client) {
  session.user = actor;
  const response = await call(submit, {
    loanTypeId: typeId,
    amountRequested: amount,
    termMonths: 12,
    purpose: "Purchase farming equipment",
  });
  expect(response.status).toBe(200);
  return response.json();
}
async function approved(amount = "1000000", actor = client) {
  const app = await application(amount, actor);
  session.user = treasurer;
  expect(
    (await call(approve, { comment: "Reviewed eligibility" }, app.id)).status,
  ).toBe(200);
  let row = await prisma.loanApplication.findUniqueOrThrow({
    where: { id: app.id },
    include: { contract: true },
  });
  if (row.status === "UNDER_REVIEW") {
    session.user = board;
    expect(
      (await call(approve, { comment: "Board approval" }, app.id)).status,
    ).toBe(200);
    row = await prisma.loanApplication.findUniqueOrThrow({
      where: { id: app.id },
      include: { contract: true },
    });
  }
  return row;
}
async function signed(amount = "1000000", actor = client) {
  const app = await approved(amount, actor);
  session.user = actor;
  expect(
    (
      await call(
        sign,
        {
          typedName: "Rose Ayo",
          signature: signatureFixture(),
          documentHash: app.contract!.documentHash,
          agree: true,
        },
        app.contract!.id,
      )
    ).status,
  ).toBe(200);
  return app;
}

async function activeLoan(amount = "1000000", actor = client) {
  const app = await signed(amount, actor);
  session.user = treasurer;
  expect(
    (await call(disburse, { password, confirm: true }, app.id)).status,
  ).toBe(200);
  return prisma.loan.findUniqueOrThrow({
    where: { loanApplicationId: app.id },
    include: { schedule: { orderBy: { installmentNumber: "asc" } } },
  });
}
function receipt(amount: string, changes: Record<string, unknown> = {}) {
  return {
    amount,
    paymentDate: businessDate(),
    method: "CASH",
    reference: `PAY-${randomUUID()}`,
    confirm: true,
    ...changes,
  };
}
async function loanState(id: string) {
  return prisma.loan.findUniqueOrThrow({
    where: { id },
    include: {
      schedule: { orderBy: { installmentNumber: "asc" } },
      payments: {
        orderBy: { id: "asc" },
        include: { allocations: { orderBy: { scheduleId: "asc" } } },
      },
    },
  });
}

describe.skipIf(!process.env.LOAN_TEST_DATABASE_URL)(
  "loan lifecycle against disposable PostgreSQL",
  () => {
    beforeAll(async () => {
      const url = new URL(process.env.LOAN_TEST_DATABASE_URL!);
      if (
        !["127.0.0.1", "localhost"].includes(url.hostname) ||
        url.pathname !== "/hlusca_loans_test"
      )
        throw new Error(
          "Integration tests require a local, disposable hlusca_loans_test database.",
        );
      passwordHash = await hashPassword(password);
      admin = await staff("ADMIN");
      treasurer = await staff("TREASURER");
      board = await staff("BOARD");
      client = await member();
      outsider = await member();
      session.user = admin;
      const response = await call(createType, typeInput);
      expect(response.status).toBe(200);
      typeId = (await response.json()).id;
    }, 30000);
    beforeEach(async () => {
      session.user = admin;
      expect(
        (await call(updateThreshold, { threshold: "3000000" })).status,
      ).toBe(200);
    });
    afterAll(async () => {
      vi.unstubAllEnvs();
      await prisma.$disconnect();
    });

    it("routes both sides of the threshold and changes routing when Admin updates the setting", async () => {
      const low = await application("2999999.99");
      const equal = await application("3000000");
      expect(
        low.approvalSteps.map(
          (step: { approverRole: string }) => step.approverRole,
        ),
      ).toEqual(["TREASURER"]);
      expect(
        equal.approvalSteps.map(
          (step: { approverRole: string }) => step.approverRole,
        ),
      ).toEqual(["TREASURER", "BOARD"]);
      session.user = admin;
      expect(
        (await call(updateThreshold, { threshold: "500000" })).status,
      ).toBe(200);
      const rerouted = await application("1000000");
      expect(rerouted.approvalSteps).toHaveLength(2);
      expect(
        (
          await prisma.loanApplication.findUniqueOrThrow({
            where: { id: low.id },
          })
        ).boardApprovalThreshold.toString(),
      ).toBe("3000000");
      session.user = board;
      expect(
        (await call(approve, { comment: "Too early" }, equal.id)).status,
      ).toBe(403);
      session.user = treasurer;
      const recommended = await call(approve, {}, equal.id);
      expect((await recommended.json()).status).toBe("UNDER_REVIEW");
      expect((await call(approve, {}, equal.id)).status).toBe(403);
      session.user = board;
      expect((await (await call(approve, {}, equal.id)).json()).status).toBe(
        "APPROVED",
      );
    });

    it("freezes product terms, persists the PDF and signature evidence, and atomically disburses with a schedule", async () => {
      const app = await application();
      session.user = admin;
      expect(
        (await call(updateType, { ...typeInput, interestRate: "24" }, typeId))
          .status,
      ).toBe(200);
      session.user = treasurer;
      expect((await call(approve, {}, app.id)).status).toBe(200);
      const contract = await prisma.loanContract.findUniqueOrThrow({
        where: { loanApplicationId: app.id },
      });
      expect((contract.terms as { interestRate: string }).interestRate).toBe(
        "12",
      );
      expect(Buffer.from(contract.documentPdf).toString("latin1")).toContain(
        "%PDF-1.4",
      );
      session.user = client;
      expect((await read(document, contract.id)).status).toBe(200);
      expect(
        (
          await call(
            sign,
            {
              typedName: "Rose Ayo",
              signature: signatureFixture(),
              agree: true,
              documentHash: contract.documentHash,
            },
            contract.id,
          )
        ).status,
      ).toBe(200);
      const signedContract = await prisma.loanContract.findUniqueOrThrow({
        where: { id: contract.id },
      });
      expect(signedContract.signingIpAddress).toBe("127.0.0.7");
      expect(signedContract.signingUserAgent).toBe("Loan lifecycle test");
      expect(signedContract.memberSignedAt).toBeInstanceOf(Date);
      const audits = await prisma.auditLog.findMany({
        where: { entityId: contract.id, action: "SIGN", status: "SUCCESS" },
      });
      expect(audits).toHaveLength(1);
      expect(audits[0].afterState).toMatchObject({
        signatureHash: signedContract.signatureHash,
        documentHash: contract.documentHash,
        signedName: "Rose Ayo",
      });
      const oldBalance = (
        await prisma.savingsAccount.findUniqueOrThrow({
          where: { memberId: client.memberId },
        })
      ).balance;
      session.user = treasurer;
      const response = await call(
        disburse,
        { password, confirm: true },
        app.id,
      );
      expect(response.status).toBe(200);
      const loan = await response.json();
      expect(loan.processingFee).toBe("25000");
      expect(loan.netDisbursement).toBe("975000");
      const rows = await prisma.loanSchedule.findMany({
        where: { loanId: loan.id },
        orderBy: { installmentNumber: "asc" },
      });
      expect(rows).toHaveLength(12);
      expect(
        rows
          .reduce(
            (sum, row) => sum.plus(row.principalDue),
            new Prisma.Decimal(0),
          )
          .toString(),
      ).toBe("1000000");
      expect(
        rows
          .reduce((sum, row) => sum.plus(row.totalDue), new Prisma.Decimal(0))
          .toString(),
      ).toBe(loan.outstandingBalance);
      expect(rows.at(-1)!.principalBalanceAfter.toString()).toBe("0");
      expect(
        (
          await prisma.savingsAccount.findUniqueOrThrow({
            where: { memberId: client.memberId },
          })
        ).balance
          .minus(oldBalance)
          .toString(),
      ).toBe("975000");
      expect(
        await prisma.transaction.count({
          where: {
            id: loan.disbursementTransactionId,
            type: "LOAN_DISBURSEMENT",
          },
        }),
      ).toBe(1);
      expect(
        await prisma.auditLog.count({
          where: { entityId: loan.id, action: "DISBURSE", status: "SUCCESS" },
        }),
      ).toBe(1);
      session.user = outsider;
      expect((await read(document, contract.id)).status).toBe(404);
      expect((await read(signatureImage, contract.id)).status).toBe(404);
      expect((await read(schedule, loan.id)).status).toBe(404);
      session.user = admin;
      await call(updateType, typeInput, typeId);
    });

    it("captures rejection reason, notifies the member, and stops the contract flow", async () => {
      const app = await application();
      session.user = treasurer;
      expect(
        (
          await call(
            reject,
            { comment: "Insufficient supporting information" },
            app.id,
          )
        ).status,
      ).toBe(200);
      const row = await prisma.loanApplication.findUniqueOrThrow({
        where: { id: app.id },
        include: { contract: true },
      });
      expect(row.status).toBe("REJECTED");
      expect(row.rejectionReason).toBe("Insufficient supporting information");
      expect(row.contract).toBeNull();
      expect(
        await prisma.notification.count({
          where: {
            userId: client.id,
            message: { contains: "Insufficient supporting information" },
          },
        }),
      ).toBeGreaterThan(0);
      expect(
        await prisma.auditLog.count({
          where: { entityId: app.id, action: "REJECT", status: "SUCCESS" },
        }),
      ).toBe(1);
    });

    it("audits unauthenticated, forbidden, invalid JSON and validation failures exactly once", async () => {
      const cases = [
        { actor: null, body: {}, raw: undefined, status: 401 },
        { actor: client, body: typeInput, raw: undefined, status: 403 },
        { actor: admin, body: {}, raw: "{broken", status: 400 },
        {
          actor: admin,
          body: { ...typeInput, interestRate: "-12" },
          raw: undefined,
          status: 400,
        },
      ];
      for (const item of cases) {
        session.user = item.actor;
        const where = {
          actorId: item.actor?.id ?? null,
          action: "CREATE" as const,
          entityType: "LoanType",
          status: "FAILURE" as const,
        };
        const count = await prisma.auditLog.count({ where });
        expect((await call(createType, item.body, "", item.raw)).status).toBe(
          item.status,
        );
        expect(await prisma.auditLog.count({ where })).toBe(count + 1);
      }
    });

    it("accepts the configured loopback origin on static routes and rejects cross-site writes", async () => {
      session.user = admin;
      const input = { ...typeInput, name: `${prefix}-origin-check` };
      const request = (origin: string) =>
        new NextRequest("http://127.0.0.1:3000/api/loan-types", {
          method: "POST",
          headers: { "Content-Type": "application/json", origin },
          body: JSON.stringify(input),
        });
      expect(
        (await createType(request("https://unrelated.example"), {})).status,
      ).toBe(403);
      expect(
        (
          await createType(
            request(new URL(process.env.NEXTAUTH_URL!).origin),
            {},
          )
        ).status,
      ).toBe(200);
    });

    it("enforces the role matrix, owner scope, explicit signing consent and step-up", async () => {
      const app = await approved();
      for (const actor of [admin, board, outsider]) {
        session.user = actor;
        expect(
          (
            await call(
              sign,
              {
                typedName: "Rose Ayo",
                signature: signatureFixture(),
                agree: true,
                documentHash: app.contract!.documentHash,
              },
              app.contract!.id,
            )
          ).status,
        ).toBe(actor === outsider ? 404 : 403);
      }
      session.user = client;
      expect((await call(approve, {}, app.id)).status).toBe(403);
      expect(
        (
          await call(
            sign,
            {
              typedName: "Rose Ayo",
              signature: signatureFixture(),
              agree: false,
              documentHash: app.contract!.documentHash,
            },
            app.contract!.id,
          )
        ).status,
      ).toBe(400);
      expect(
        (
          await call(
            sign,
            {
              typedName: "Another Name",
              signature: signatureFixture(),
              agree: true,
              documentHash: app.contract!.documentHash,
            },
            app.contract!.id,
          )
        ).status,
      ).toBe(400);
      expect(
        (await read(list, "", `?memberId=${outsider.memberId}`)).status,
      ).toBe(403);
      session.user = treasurer;
      expect(
        (
          await call(
            disburse,
            { password: "wrong-password", confirm: true },
            app.id,
          )
        ).status,
      ).toBe(403);
      expect(
        (await call(disburse, { password, confirm: true }, app.id)).status,
      ).toBe(409);
      expect(
        await prisma.loan.count({ where: { loanApplicationId: app.id } }),
      ).toBe(0);
    });

    it("serializes concurrent disbursements into exactly one credit, loan, schedule and success audit", async () => {
      const app = await signed("3000000");
      session.user = treasurer;
      const results = await Promise.all([
        call(disburse, { password, confirm: true }, app.id),
        call(disburse, { password, confirm: true }, app.id),
      ]);
      expect(results.map((row) => row.status).sort()).toEqual([200, 409]);
      expect(
        await prisma.loan.count({ where: { loanApplicationId: app.id } }),
      ).toBe(1);
      expect(
        await prisma.transaction.count({
          where: { reference: `LOAN-${app.id}` },
        }),
      ).toBe(1);
      const loan = await prisma.loan.findUniqueOrThrow({
        where: { loanApplicationId: app.id },
      });
      expect(
        await prisma.loanSchedule.count({ where: { loanId: loan.id } }),
      ).toBe(12);
      expect(
        await prisma.auditLog.count({
          where: { action: "DISBURSE", entityId: loan.id, status: "SUCCESS" },
        }),
      ).toBe(1);
      expect(
        await prisma.auditLog.count({
          where: { action: "DISBURSE", entityId: app.id, status: "FAILURE" },
        }),
      ).toBe(1);
    });

    it("rolls back financial writes when their audit insert fails", async () => {
      const app = await signed();
      const original = (
        await prisma.savingsAccount.findUniqueOrThrow({
          where: { memberId: client.memberId },
        })
      ).balance;
      // The temporary trigger targets this one test operation. No production connection is permitted.
      await prisma.$executeRawUnsafe(
        `CREATE OR REPLACE FUNCTION hlusca.fail_loan_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'DISBURSE' AND NEW.status = 'SUCCESS' THEN RAISE EXCEPTION 'Injected audit failure'; END IF; RETURN NEW; END $$`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE TRIGGER fail_loan_test_audit BEFORE INSERT ON hlusca."AuditLog" FOR EACH ROW EXECUTE FUNCTION hlusca.fail_loan_test_audit()`,
      );
      try {
        session.user = treasurer;
        expect(
          (await call(disburse, { password, confirm: true }, app.id)).status,
        ).toBe(500);
        expect(
          await prisma.loan.count({ where: { loanApplicationId: app.id } }),
        ).toBe(0);
        expect(
          await prisma.transaction.count({
            where: { reference: `LOAN-${app.id}` },
          }),
        ).toBe(0);
        expect(
          (
            await prisma.savingsAccount.findUniqueOrThrow({
              where: { memberId: client.memberId },
            })
          ).balance.toString(),
        ).toBe(original.toString());
        expect(
          await prisma.auditLog.count({
            where: { entityId: app.id, action: "DISBURSE", status: "FAILURE" },
          }),
        ).toBe(1);
      } finally {
        await prisma.$executeRawUnsafe(
          `DROP TRIGGER fail_loan_test_audit ON hlusca."AuditLog"`,
        );
        await prisma.$executeRawUnsafe(
          `DROP FUNCTION hlusca.fail_loan_test_audit()`,
        );
      }
    });

    it("protects signed contract evidence from database edits and rejects repeat signing", async () => {
      const app = await signed();
      session.user = client;
      expect(
        (
          await call(
            sign,
            {
              typedName: "Rose Ayo",
              signature: signatureFixture(),
              agree: true,
              documentHash: app.contract!.documentHash,
            },
            app.contract!.id,
          )
        ).status,
      ).toBe(409);
      await expect(
        prisma.loanContract.update({
          where: { id: app.contract!.id },
          data: { signedName: "Changed" },
        }),
      ).rejects.toThrow("immutable");
      await expect(
        prisma.loanContract.update({
          where: { id: app.contract!.id },
          data: { documentHash: "a".repeat(64) },
        }),
      ).rejects.toThrow("immutable");
    });

    it.each(["1000000", "3000000"])(
      "repays and closes a %s loan through partial, rollover and final payments",
      async (principal) => {
        const loan = await activeLoan(principal);
        const initialSavings = (
          await prisma.savingsAccount.findUniqueOrThrow({
            where: { memberId: client.memberId },
          })
        ).balance.toFixed(2);
        const first = receipt("5000");
        const firstResponse = await call(repay, first, loan.id);
        expect(firstResponse.status).toBe(200);
        const firstPayment = (await firstResponse.json()).payment;
        let state = await loanState(loan.id);
        expect(state.schedule[0].status).toBe("PARTIAL");
        expect(state.schedule[0].interestPaid.toFixed(2)).toBe("5000.00");
        expect(state.schedule[0].principalPaid.toFixed(2)).toBe("0.00");
        const rollover = loan.schedule[0].totalDue
          .minus(5000)
          .plus(loan.schedule[1].totalDue)
          .plus(1);
        expect(
          (await call(repay, receipt(rollover.toFixed(2)), loan.id)).status,
        ).toBe(200);
        state = await loanState(loan.id);
        expect(state.schedule.slice(0, 3).map((row) => row.status)).toEqual([
          "PAID",
          "PAID",
          "PARTIAL",
        ]);
        const success = await prisma.auditLog.findFirstOrThrow({
          where: {
            entityType: "LoanPayment",
            entityId: firstPayment.id,
            status: "SUCCESS",
          },
        });
        expect(success.beforeState).toMatchObject({
          loanId: loan.id,
          outstandingBalance: loan.outstandingBalance.toString(),
        });
        expect(success.afterState).toMatchObject({
          loanId: loan.id,
          payment: { id: firstPayment.id },
          allocations: [
            { paymentId: firstPayment.id, interestAmount: "5000.00" },
          ],
        });
        expect(
          (
            await call(
              repay,
              receipt(state.outstandingBalance.toFixed(2)),
              loan.id,
            )
          ).status,
        ).toBe(200);
        state = await loanState(loan.id);
        expect(state.status).toBe("CLOSED");
        expect(state.outstandingBalance.toFixed(2)).toBe("0.00");
        expect(state.schedule.every((row) => row.status === "PAID")).toBe(true);
        expect((await call(repay, receipt("0.01"), loan.id)).status).toBe(409);
        expect(
          (
            await prisma.savingsAccount.findUniqueOrThrow({
              where: { memberId: client.memberId },
            })
          ).balance.toFixed(2),
        ).toBe(initialSavings);
        session.user = client;
        const ledger = (await (
          await read(statement, loan.id)
        ).json()) as LoanStatement;
        expect(ledger.rows.at(-1)?.balance).toBe("0.00");
        expect(ledger.totalPaid).toBe(loan.outstandingBalance.toFixed(2));
        expect(
          ledger.rows
            .filter((row) => row.type === "PAYMENT")
            .reduce(
              (sum, row) => sum.plus(row.principal),
              new Prisma.Decimal(0),
            )
            .toFixed(2),
        ).toBe(`${principal}.00`);
      },
    );

    it("reconciles a backdated receipt and records changed older allocations in the audit", async () => {
      const loan = await activeLoan();
      await prisma.loan.update({
        where: { id: loan.id },
        data: { disbursementDate: new Date("2000-01-01T00:00:00Z") },
      });
      const late = await (
        await call(
          repay,
          receipt("15000", {
            paymentDate: "2001-01-20",
            reference: "LATE-RECEIPT",
          }),
          loan.id,
        )
      ).json();
      expect(
        (
          await loanState(loan.id)
        ).payments[0].allocations[0].interestAmount.toFixed(2),
      ).toBe("10000.00");
      const earlyResponse = await call(
        repay,
        receipt("5000", {
          paymentDate: "2001-01-05",
          reference: "EARLY-RECEIPT",
        }),
        loan.id,
      );
      expect(earlyResponse.status).toBe(200);
      const early = await earlyResponse.json();
      const state = await loanState(loan.id);
      expect(
        state.payments.find((p) => p.id === late.payment.id)!.allocations[0],
      ).toMatchObject({
        interestAmount: new Prisma.Decimal(5000),
        principalAmount: new Prisma.Decimal(10000),
      });
      const audit = await prisma.auditLog.findFirstOrThrow({
        where: {
          entityId: early.payment.id,
          entityType: "LoanPayment",
          status: "SUCCESS",
        },
      });
      expect(JSON.stringify(audit.beforeState)).toContain(
        '"interestAmount":"10000"',
      );
      expect(JSON.stringify(audit.afterState)).toContain(
        '"interestAmount":"5000.00"',
      );
      session.user = client;
      const ledger = await (
        await read(statement, loan.id, "?from=2001-01-10&type=PAYMENT")
      ).json();
      expect(ledger.rows).toHaveLength(1);
      expect(ledger.rows[0]).toMatchObject({
        reference: "LATE-RECEIPT",
        interest: "5000.00",
        balance: "1100000.00",
      });
      expect((await read(statement, loan.id, "?page=2")).status).toBe(200);
    });

    it("supports installment references and rejects duplicates, surplus and invalid dates without writes", async () => {
      const loan = await activeLoan();
      const input = receipt("100", { reference: " inst-3/receipt-123 " });
      expect((await call(repay, input, loan.id)).status).toBe(200);
      let state = await loanState(loan.id);
      expect(state.payments[0]).toMatchObject({
        reference: "INST-3/RECEIPT-123",
        targetInstallmentNumber: 3,
      });
      expect(state.schedule[2].status).toBe("PARTIAL");
      expect(state.schedule[0].status).toBe("PENDING");
      const before = JSON.stringify(state);
      const invalid = [
        input,
        receipt("1120000"),
        receipt("10", { paymentDate: "1999-01-01" }),
        receipt("10", { paymentDate: "2099-01-01" }),
        receipt("10", { targetInstallmentNumber: 13 }),
        receipt("10", {
          reference: "INST-3/DIFFERENT",
          targetInstallmentNumber: 2,
        }),
        receipt("10", { confirm: false }),
      ];
      for (const request of invalid)
        expect(
          (await call(repay, request, loan.id)).status,
        ).toBeGreaterThanOrEqual(400);
      state = await loanState(loan.id);
      expect(JSON.stringify(state)).toBe(before);
      expect(
        await prisma.auditLog.count({
          where: {
            entityId: loan.id,
            entityType: "LoanPayment",
            status: "FAILURE",
          },
        }),
      ).toBe(invalid.length);
      await expect(
        prisma.loanPayment.update({
          where: { id: state.payments[0].id },
          data: { amount: "200" },
        }),
      ).rejects.toThrow("immutable");
      await expect(
        prisma.loanPayment.delete({ where: { id: state.payments[0].id } }),
      ).rejects.toThrow("immutable");
    });

    it("enforces repayment roles, fresh account status, CSRF and member statement ownership", async () => {
      const loan = await activeLoan();
      const before = JSON.stringify(await loanState(loan.id));
      for (const actor of [null, client, board, admin]) {
        session.user = actor;
        expect((await call(repay, receipt("10"), loan.id)).status).toBe(
          actor ? 403 : 401,
        );
      }
      session.user = treasurer;
      expect((await call(repay, {}, loan.id, "{")).status).toBe(400);
      expect(
        (
          await repay(
            new NextRequest("http://localhost:3000/api/test", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                origin: "https://untrusted.example",
              },
              body: JSON.stringify(receipt("10")),
            }),
            { params: Promise.resolve({ id: loan.id }) },
          )
        ).status,
      ).toBe(403);
      await prisma.user.update({
        where: { id: treasurer.id },
        data: { status: "SUSPENDED" },
      });
      try {
        expect((await call(repay, receipt("10"), loan.id)).status).toBe(401);
      } finally {
        await prisma.user.update({
          where: { id: treasurer.id },
          data: { status: "ACTIVE" },
        });
      }
      expect(JSON.stringify(await loanState(loan.id))).toBe(before);
      session.user = outsider;
      expect((await read(statement, loan.id)).status).toBe(404);
      expect((await read(statement, loan.id, "?format=pdf")).status).toBe(404);
      expect(
        await prisma.auditLog.count({
          where: {
            entityType: "LoanStatement",
            entityId: loan.id,
            actorId: outsider.id,
            status: "FAILURE",
          },
        }),
      ).toBe(1);
      session.user = client;
      for (const format of ["pdf", "csv"]) {
        const response = await read(statement, loan.id, `?format=${format}`);
        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toContain("no-store");
        const text = await response.text();
        expect(text).toContain(loan.id);
        expect(text).toContain("Rose Ayo");
        if (format === "pdf") expect(text).toMatch(/^%PDF-1.4/);
      }
      expect(
        await prisma.auditLog.count({
          where: {
            entityType: "LoanStatement",
            entityId: loan.id,
            actorId: client.id,
            status: "SUCCESS",
          },
        }),
      ).toBe(2);
      for (const actor of [admin, board, treasurer]) {
        session.user = actor;
        expect((await read(statement, loan.id)).status).toBe(200);
      }
    });

    it("serializes competing payments and duplicate receipts without losing money", async () => {
      const loan = await activeLoan();
      const responses = await Promise.all([
        call(repay, receipt("600000"), loan.id),
        call(repay, receipt("600000"), loan.id),
      ]);
      expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
      let state = await loanState(loan.id);
      expect(state.payments).toHaveLength(1);
      expect(state.outstandingBalance.toFixed(2)).toBe("520000.00");
      const duplicate = receipt("100");
      const repeated = await Promise.all([
        call(repay, duplicate, loan.id),
        call(repay, duplicate, loan.id),
      ]);
      expect(repeated.map((r) => r.status).sort()).toEqual([200, 409]);
      state = await loanState(loan.id);
      expect(state.payments).toHaveLength(2);
      expect(state.outstandingBalance.toFixed(2)).toBe("519900.00");
    });

    it("rolls back receipt, matching, balance and notification when repayment auditing fails", async () => {
      const loan = await activeLoan();
      const initial = JSON.stringify(await loanState(loan.id));
      const notices = await prisma.notification.count({
        where: { userId: client.id },
      });
      await prisma.$executeRawUnsafe(
        `CREATE FUNCTION hlusca.fail_payment_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."entityType" = 'LoanPayment' AND NEW.status = 'SUCCESS' THEN RAISE EXCEPTION 'Injected repayment audit failure'; END IF; RETURN NEW; END $$`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE TRIGGER fail_payment_test_audit BEFORE INSERT ON hlusca."AuditLog" FOR EACH ROW EXECUTE FUNCTION hlusca.fail_payment_test_audit()`,
      );
      try {
        expect((await call(repay, receipt("100"), loan.id)).status).toBe(500);
        expect(JSON.stringify(await loanState(loan.id))).toBe(initial);
        expect(
          await prisma.notification.count({ where: { userId: client.id } }),
        ).toBe(notices);
        expect(
          await prisma.auditLog.count({
            where: {
              entityType: "LoanPayment",
              entityId: loan.id,
              status: "FAILURE",
            },
          }),
        ).toBe(1);
      } finally {
        await prisma.$executeRawUnsafe(
          `DROP TRIGGER fail_payment_test_audit ON hlusca."AuditLog"`,
        );
        await prisma.$executeRawUnsafe(
          `DROP FUNCTION hlusca.fail_payment_test_audit()`,
        );
      }
    });

    it("flags overdue installments daily, authenticates the job and stays safe against a simultaneous payoff", async () => {
      const loan = await activeLoan();
      const today = businessDate();
      const yesterday = new Date(`${today}T00:00:00Z`);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      expect(
        (
          await call(
            repay,
            receipt(loan.schedule[0].totalDue.plus(1).toFixed(2)),
            loan.id,
          )
        ).status,
      ).toBe(200);
      await prisma.loanSchedule.updateMany({
        where: { loanId: loan.id, installmentNumber: { lte: 3 } },
        data: { dueDate: yesterday },
      });
      await prisma.loanSchedule.update({
        where: { id: loan.schedule[3].id },
        data: { dueDate: new Date(`${today}T00:00:00Z`) },
      });
      vi.stubEnv(
        "CRON_SECRET",
        "test-only-overdue-secret-at-least-32-characters",
      );
      const invoke = (authorized = true) =>
        overdue(
          new NextRequest("http://localhost:3000/api/cron/loans/overdue", {
            headers: authorized
              ? { authorization: `Bearer ${process.env.CRON_SECRET}` }
              : {},
          }),
        );
      expect((await invoke(false)).status).toBe(401);
      expect((await invoke()).status).toBe(200);
      const state = await loanState(loan.id);
      expect(state.schedule.slice(0, 4).map((s) => s.status)).toEqual([
        "PAID",
        "OVERDUE",
        "OVERDUE",
        "PENDING",
      ]);
      expect((await (await invoke()).json()).updated).toBe(0);
      const jobLogs = await prisma.auditLog.findMany({
        where: {
          entityType: "LoanSchedule",
          status: "SUCCESS",
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      const log = jobLogs.find((entry) =>
        JSON.stringify(entry.afterState).includes(loan.id),
      );
      expect(log).toBeDefined();
      expect(JSON.stringify(log!.beforeState)).toContain("PARTIAL");
      expect(JSON.stringify(log!.afterState)).toContain("OVERDUE");
      await prisma.loanSchedule.update({
        where: { id: loan.schedule[3].id },
        data: { dueDate: yesterday },
      });
      const responses = await Promise.all([
        call(repay, receipt(state.outstandingBalance.toFixed(2)), loan.id),
        invoke(),
      ]);
      expect(responses.map((r) => r.status)).toEqual([200, 200]);
      const closed = await loanState(loan.id);
      expect(closed.status).toBe("CLOSED");
      expect(closed.schedule.every((s) => s.status === "PAID")).toBe(true);
      vi.stubEnv("CRON_SECRET", "");
      expect((await invoke()).status).toBe(503);
    });

    it("lets sessionless cron and audited repayment routes reach their own authentication", async () => {
      for (const path of [
        "/api/cron/loans/overdue",
        "/api/loans/test/payments",
        "/api/loans/test/statement?format=pdf",
      ]) {
        const response = await proxy(
          new NextRequest(`http://localhost:3000${path}`),
        );
        expect(response.headers.get("x-middleware-next")).toBe("1");
      }
      expect(
        (await proxy(new NextRequest("http://localhost:3000/api/members")))
          .status,
      ).toBe(401);
      expect(
        (await proxy(new NextRequest("http://localhost:3000/dashboard/loans")))
          .status,
      ).toBe(307);
    });

    it("rejects self-recording and cross-loan allocation links", async () => {
      const loan = await activeLoan();
      const other = await activeLoan("1000000", outsider);
      await prisma.user.update({
        where: { id: client.id },
        data: { role: "TREASURER" },
      });
      try {
        session.user = { ...client, role: "TREASURER" };
        expect((await call(repay, receipt("100"), loan.id)).status).toBe(403);
      } finally {
        await prisma.user.update({
          where: { id: client.id },
          data: { role: "CLIENT" },
        });
      }
      session.user = treasurer;
      const response = await call(repay, receipt("100"), loan.id);
      const paymentId = (await response.json()).payment.id;
      await expect(
        prisma.loanPaymentAllocation.create({
          data: {
            loanId: loan.id,
            paymentId,
            scheduleId: other.schedule[0].id,
            principalAmount: "1",
            interestAmount: "0",
          },
        }),
      ).rejects.toMatchObject({ code: "P2003" });
    });

    it("rolls back overdue flags when their audit cannot persist", async () => {
      const loan = await activeLoan();
      await prisma.loanSchedule.update({
        where: { id: loan.schedule[0].id },
        data: { dueDate: new Date("2000-01-01T00:00:00Z") },
      });
      vi.stubEnv(
        "CRON_SECRET",
        "test-only-overdue-secret-at-least-32-characters",
      );
      await prisma.$executeRawUnsafe(
        `CREATE FUNCTION hlusca.fail_overdue_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."entityType" = 'LoanSchedule' AND NEW.status = 'SUCCESS' THEN RAISE EXCEPTION 'Injected overdue audit failure'; END IF; RETURN NEW; END $$`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE TRIGGER fail_overdue_test_audit BEFORE INSERT ON hlusca."AuditLog" FOR EACH ROW EXECUTE FUNCTION hlusca.fail_overdue_test_audit()`,
      );
      const failures = await prisma.auditLog.count({
        where: { entityType: "LoanSchedule", status: "FAILURE" },
      });
      try {
        const response = await overdue(
          new NextRequest("http://localhost:3000/api/cron/loans/overdue", {
            headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
          }),
        );
        expect(response.status).toBe(500);
        expect(
          (
            await prisma.loanSchedule.findUniqueOrThrow({
              where: { id: loan.schedule[0].id },
            })
          ).status,
        ).toBe("PENDING");
        expect(
          await prisma.auditLog.count({
            where: { entityType: "LoanSchedule", status: "FAILURE" },
          }),
        ).toBe(failures + 1);
      } finally {
        await prisma.$executeRawUnsafe(
          `DROP TRIGGER fail_overdue_test_audit ON hlusca."AuditLog"`,
        );
        await prisma.$executeRawUnsafe(
          `DROP FUNCTION hlusca.fail_overdue_test_audit()`,
        );
      }
    });

    it("exports only the member's applications and audits exports and rejected scopes", async () => {
      const own = await application();
      const other = await application("1000000", outsider);
      session.user = client;
      const csv = await exportApplications(
        new NextRequest(
          "http://localhost:3000/api/loan-applications/export?format=csv",
        ),
      );
      expect(csv.status).toBe(200);
      const text = await csv.text();
      expect(text).toContain(own.id);
      expect(text).not.toContain(other.id);
      const pdf = await exportApplications(
        new NextRequest(
          "http://localhost:3000/api/loan-applications/export?format=pdf&from=2099-01-01",
        ),
      );
      expect(pdf.status).toBe(200);
      expect(await pdf.text()).toContain("No matching applications");
      const before = await prisma.auditLog.count({
        where: { actorId: client.id, action: "EXPORT", status: "FAILURE" },
      });
      const denied = await exportApplications(
        new NextRequest(
          `http://localhost:3000/api/loan-applications/export?format=csv&memberId=${outsider.memberId}`,
        ),
      );
      expect(denied.status).toBe(403);
      expect(
        await prisma.auditLog.count({
          where: { actorId: client.id, action: "EXPORT", status: "FAILURE" },
        }),
      ).toBe(before + 1);
    });
  },
);
