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
