import { Prisma, type UserRole } from "@prisma/client";
import type { z } from "zod";

import { ApiError } from "../api";
import type { RequestMetadata } from "../audit/request";
import { verifyPassword } from "../auth/passwords";
import { SYSTEM_SETTING_KEYS } from "../constants";
import { prisma } from "../db";
import { buildLoanContractPdf } from "../pdf/loan-contract";
import { setSystemSetting } from "../system-settings";
import { loanQuote } from "./schedule";
import {
  decodeSignature,
  sha256,
  SIGNATURE_CONSENT_VERSION,
} from "./signature";
import type {
  applicationFiltersSchema,
  applicationSchema,
  loanTypeSchema,
  signatureSchema,
} from "./schemas";
import type { ApplicationRecord, ContractTerms, LoanTypeRecord } from "./types";

type Db = Prisma.TransactionClient;
export type LoanActor = { id: string; role: UserRole; memberId: string | null };
export const snapshot = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value));

const applicationInclude = {
  member: { select: { memberNumber: true, firstName: true, lastName: true } },
  approvalSteps: { orderBy: { stepNumber: "asc" } },
  contract: {
    select: {
      id: true,
      status: true,
      documentHash: true,
      generatedAt: true,
      memberSignedAt: true,
      signedName: true,
      terms: true,
    },
  },
  loan: {
    select: {
      id: true,
      status: true,
      principal: true,
      outstandingBalance: true,
      disbursementDate: true,
      netDisbursement: true,
      processingFee: true,
    },
  },
} satisfies Prisma.LoanApplicationInclude;

export function assertLoanRole(actor: LoanActor, roles: UserRole[]) {
  if (!roles.includes(actor.role)) throw new ApiError("Forbidden.", 403);
}

export async function getLoanActor(
  id: string | undefined,
  db: Db = prisma,
): Promise<LoanActor> {
  if (!id) throw new ApiError("Sign in to continue.", 401);
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      memberId: true,
      status: true,
      mustChangePassword: true,
    },
  });
  if (!user || user.status !== "ACTIVE")
    throw new ApiError("Sign in with an active account.", 401);
  if (user.mustChangePassword)
    throw new ApiError("Change your password before continuing.", 403);
  return { id: user.id, role: user.role, memberId: user.memberId };
}

export async function getApprovalThreshold(db: Db = prisma) {
  const setting = await db.systemSetting.findUnique({
    where: { key: SYSTEM_SETTING_KEYS.LOAN_BOARD_APPROVAL_THRESHOLD },
  });
  // Fail closed on missing/invalid configuration; never silently bypass Board review.
  if (
    !setting ||
    !/^\d{1,12}(\.\d{1,2})?$/.test(setting.value) ||
    new Prisma.Decimal(setting.value).lte(0)
  ) {
    throw new ApiError(
      "Configure a valid Board approval threshold before accepting applications.",
      409,
    );
  }
  return setting.value;
}

export function approvalRoles(amount: string, threshold: string): UserRole[] {
  return new Prisma.Decimal(amount).gte(threshold)
    ? ["TREASURER", "BOARD"]
    : ["TREASURER"];
}

export async function listLoanTypes(
  actor: LoanActor,
  db: Db = prisma,
): Promise<LoanTypeRecord[]> {
  const rows = await db.loanType.findMany({
    where: actor.role === "ADMIN" ? {} : { active: true },
    orderBy: { name: "asc" },
  });
  return JSON.parse(JSON.stringify(rows));
}

export async function saveLoanType(
  db: Db,
  actor: LoanActor,
  input: z.infer<typeof loanTypeSchema>,
  id?: string,
) {
  assertLoanRole(actor, ["ADMIN"]);
  const before = id ? await db.loanType.findUnique({ where: { id } }) : null;
  if (id && !before) throw new ApiError("Loan type not found.", 404);
  const existing = await db.loanType.findFirst({
    where: {
      name: { equals: input.name, mode: "insensitive" },
      ...(id ? { id: { not: id } } : {}),
    },
  });
  if (existing)
    throw new ApiError("A loan type with this name already exists.", 409);
  const type = id
    ? await db.loanType.update({ where: { id }, data: input })
    : await db.loanType.create({ data: input });
  return {
    result: snapshot(type),
    entityId: type.id,
    beforeState: before ? snapshot(before) : undefined,
    afterState: snapshot(type),
  };
}

export async function saveApprovalThreshold(
  db: Db,
  actor: LoanActor,
  threshold: string,
) {
  assertLoanRole(actor, ["ADMIN"]);
  const key = SYSTEM_SETTING_KEYS.LOAN_BOARD_APPROVAL_THRESHOLD;
  const before = await db.systemSetting.findUnique({ where: { key } });
  const setting = await setSystemSetting(key, threshold, actor.id, db);
  return {
    result: { threshold },
    entityId: key,
    beforeState: before ? snapshot(before) : undefined,
    afterState: snapshot(setting),
  };
}

async function eligibility(
  db: Db,
  actor: LoanActor,
  input: { loanTypeId: string; amountRequested: string; termMonths: number },
) {
  assertLoanRole(actor, ["CLIENT"]);
  if (!actor.memberId) throw new ApiError("A member account is required.", 403);
  const member = await db.member.findUnique({
    where: { id: actor.memberId },
    include: { savingsAccount: true },
  });
  const type = await db.loanType.findUnique({
    where: { id: input.loanTypeId },
  });
  if (!type?.active)
    throw new ApiError("This loan type is not available.", 404);
  const threshold = await getApprovalThreshold(db);
  const balance = member?.savingsAccount?.balance ?? new Prisma.Decimal(0);
  const maximum = balance
    .mul(type.maxMultipleOfSavings)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
  const reasons: string[] = [];
  if (
    !member ||
    member.status !== "ACTIVE" ||
    member.savingsAccount?.status !== "ACTIVE"
  )
    reasons.push("An active membership and savings account are required.");
  if (input.termMonths > type.maxTermMonths)
    reasons.push(`The maximum term is ${type.maxTermMonths} months.`);
  if (new Prisma.Decimal(input.amountRequested).gt(maximum))
    reasons.push(
      "The requested amount exceeds your savings-based eligibility.",
    );
  const quote = loanQuote({
    principal: input.amountRequested,
    interestRate: type.interestRate.toString(),
    interestMethod: type.interestMethod,
    termMonths: input.termMonths,
    processingFeePercent: type.processingFeePercent.toString(),
    disbursementDate: new Date(),
  });
  if (new Prisma.Decimal(quote.netDisbursement).lte(0))
    reasons.push(
      "The amount must cover the processing fee and leave a positive disbursement.",
    );
  return {
    type,
    threshold,
    preview: {
      eligible: reasons.length === 0,
      reasons,
      savingsBalance: balance.toFixed(2),
      maximumAmount: maximum.toFixed(2),
      approvalRoles: approvalRoles(input.amountRequested, threshold),
      ...quote,
    },
  };
}

export async function previewEligibility(
  actor: LoanActor,
  input: Parameters<typeof eligibility>[2],
) {
  return (await eligibility(prisma, actor, input)).preview;
}

export async function submitApplication(
  db: Db,
  actor: LoanActor,
  input: z.infer<typeof applicationSchema>,
) {
  const { type, threshold, preview } = await eligibility(db, actor, input);
  if (!preview.eligible) throw new ApiError(preview.reasons.join(" "), 400);
  const application = await db.loanApplication.create({
    data: {
      ...input,
      memberId: actor.memberId!,
      loanTypeName: type.name,
      interestMethod: type.interestMethod,
      interestRate: type.interestRate,
      processingFeePercent: type.processingFeePercent,
      maxMultipleOfSavings: type.maxMultipleOfSavings,
      boardApprovalThreshold: threshold,
      approvalSteps: {
        create: preview.approvalRoles.map((role, i) => ({
          approverRole: role,
          stepNumber: i + 1,
        })),
      },
    },
    include: applicationInclude,
  });
  return {
    result: snapshot(application),
    entityId: application.id,
    afterState: snapshot(application),
  };
}

export async function listApplications(
  actor: LoanActor,
  filters: z.infer<typeof applicationFiltersSchema>,
  db: Db = prisma,
  pageSize = 10,
) {
  if (
    actor.role === "CLIENT" &&
    (!actor.memberId ||
      (filters.memberId && filters.memberId !== actor.memberId))
  )
    throw new ApiError("Forbidden.", 403);
  const where: Prisma.LoanApplicationWhereInput = {
    ...(actor.role === "CLIENT"
      ? { memberId: actor.memberId! }
      : filters.memberId
        ? { memberId: filters.memberId }
        : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.from || filters.to
      ? {
          submittedAt: {
            ...(filters.from
              ? { gte: new Date(`${filters.from}T00:00:00Z`) }
              : {}),
            ...(filters.to
              ? {
                  lt: new Date(
                    new Date(`${filters.to}T00:00:00Z`).getTime() + 86400000,
                  ),
                }
              : {}),
          },
        }
      : {}),
    ...(filters.query
      ? {
          OR: [
            { loanTypeName: { contains: filters.query, mode: "insensitive" } },
            {
              member: {
                memberNumber: { contains: filters.query, mode: "insensitive" },
              },
            },
            {
              member: {
                firstName: { contains: filters.query, mode: "insensitive" },
              },
            },
            {
              member: {
                lastName: { contains: filters.query, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };
  if (filters.queue === "true") {
    assertLoanRole(actor, ["TREASURER", "BOARD"]);
    where.AND = [
      { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      {
        approvalSteps: {
          some: { approverRole: actor.role, decision: "PENDING" },
        },
      },
      ...(actor.role === "BOARD"
        ? [
            {
              approvalSteps: {
                some: {
                  approverRole: "TREASURER" as const,
                  decision: "APPROVED" as const,
                },
              },
            },
          ]
        : []),
    ];
  }
  const [applications, total] = await Promise.all([
    db.loanApplication.findMany({
      where,
      include: applicationInclude,
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      skip: (filters.page - 1) * pageSize,
      take: pageSize,
    }),
    db.loanApplication.count({ where }),
  ]);
  return {
    applications: JSON.parse(
      JSON.stringify(applications),
    ) as ApplicationRecord[],
    total,
    page: filters.page,
    pageSize,
  };
}

export async function getApplication(
  id: string,
  actor: LoanActor,
  db: Db = prisma,
) {
  if (actor.role === "CLIENT" && !actor.memberId)
    throw new ApiError("Forbidden.", 403);
  const application = await db.loanApplication.findFirst({
    where: {
      id,
      ...(actor.role === "CLIENT" ? { memberId: actor.memberId! } : {}),
    },
    include: applicationInclude,
  });
  if (!application) throw new ApiError("Loan application not found.", 404);
  return application;
}

async function lockApplication(db: Db, id: string) {
  await db.$queryRaw`SELECT "id" FROM "hlusca"."LoanApplication" WHERE "id" = ${id} FOR UPDATE`;
}

async function notifyMember(db: Db, memberId: string, message: string) {
  const user = await db.user.findUnique({
    where: { memberId },
    select: { id: true },
  });
  if (user)
    await db.notification.create({
      data: { userId: user.id, type: "SYSTEM", message },
    });
}

async function createContract(
  db: Db,
  application: Awaited<ReturnType<typeof getApplication>>,
) {
  if (application.status !== "APPROVED")
    throw new ApiError(
      "Only approved applications can receive a contract.",
      409,
    );
  if (application.contract) return application.contract;
  const now = new Date();
  const quote = loanQuote({
    principal: application.amountRequested.toString(),
    interestRate: application.interestRate.toString(),
    interestMethod: application.interestMethod,
    termMonths: application.termMonths,
    processingFeePercent: application.processingFeePercent.toString(),
    disbursementDate: now,
  });
  const terms: ContractTerms = {
    version: "1",
    applicationId: application.id,
    memberName: `${application.member.firstName} ${application.member.lastName}`,
    memberNumber: application.member.memberNumber,
    loanTypeName: application.loanTypeName,
    principal: application.amountRequested.toFixed(2),
    interestRate: application.interestRate.toString(),
    interestMethod: application.interestMethod,
    termMonths: application.termMonths,
    processingFeePercent: application.processingFeePercent.toString(),
    generatedAt: now.toISOString(),
    ...quote,
    conditions: [
      "I agree to repay the principal and scheduled interest in monthly installments under the terms shown in this agreement.",
      "Interest is an annual percentage, converted to a monthly rate by dividing by 12. Flat interest applies to the original principal for the full term; reducing-balance interest applies to the remaining principal each month.",
      "The processing fee is withheld once from the principal. The remaining amount is credited to my HLUSCA savings account. The full principal remains repayable.",
      "The first installment falls one calendar month after disbursement. Each due date uses the original day, clamped to the last day of shorter months. The dates below are a preview; the final schedule is available immediately after disbursement.",
      "All amounts are in UGX, rounded to two decimal places. The last installment adjusts rounding so the principal is fully repaid.",
      "Disbursement requires my signed agreement, an active membership and savings account, and sufficient savings to meet the agreed eligibility multiple at disbursement.",
      "By confirming my full name, drawing my signature and selecting I agree, I accept this agreement electronically and consent to retention of the signature and its timestamp, IP address and browser information.",
    ],
  };
  const documentPdf = buildLoanContractPdf(terms);
  return db.loanContract.create({
    data: {
      loanApplicationId: application.id,
      terms: snapshot(terms),
      documentPdf,
      documentHash: sha256(documentPdf),
      generatedAt: now,
    },
  });
}

export async function reviewApplication(
  db: Db,
  actor: LoanActor,
  id: string,
  decision: "APPROVED" | "REJECTED",
  comment: string,
) {
  assertLoanRole(actor, ["TREASURER", "BOARD"]);
  await lockApplication(db, id);
  const before = await getApplication(id, actor, db);
  if (actor.memberId === before.memberId)
    throw new ApiError("You cannot review your own application.", 403);
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(before.status))
    throw new ApiError("This application has already been decided.", 409);
  const nextStep = before.approvalSteps.find(
    (step) => step.decision === "PENDING",
  );
  if (!nextStep || nextStep.approverRole !== actor.role)
    throw new ApiError(
      "This application is awaiting another reviewer's decision.",
      403,
    );
  if (before.approvalSteps.some((step) => step.approverId === actor.id))
    throw new ApiError(
      "Separate reviewers must complete the approval chain.",
      403,
    );
  if (decision === "REJECTED" && comment.trim().length < 3)
    throw new ApiError("Provide a reason for rejection.");
  const now = new Date();
  await db.loanApprovalStep.update({
    where: { id: nextStep.id },
    data: {
      decision,
      comment: comment || null,
      approverId: actor.id,
      decidedAt: now,
    },
  });
  const final =
    decision === "REJECTED" ||
    before.approvalSteps.every(
      (step) => step.id === nextStep.id || step.decision === "APPROVED",
    );
  const status = final
    ? decision === "REJECTED"
      ? "REJECTED"
      : "APPROVED"
    : "UNDER_REVIEW";
  const application = await db.loanApplication.update({
    where: { id },
    data: {
      status,
      ...(final ? { decidedAt: now, decidedById: actor.id } : {}),
      rejectionReason: decision === "REJECTED" ? comment : null,
    },
    include: applicationInclude,
  });
  if (status === "APPROVED") await createContract(db, application);
  await notifyMember(
    db,
    before.memberId,
    status === "REJECTED"
      ? `Your ${before.loanTypeName} loan application was rejected: ${comment}`
      : status === "APPROVED"
        ? `Your ${before.loanTypeName} loan application is approved. Open Loans to review and sign your contract.`
        : `Your ${before.loanTypeName} loan application has been recommended by the Treasurer and is awaiting Board approval.`,
  );
  const after = await getApplication(id, actor, db);
  return {
    result: snapshot(after),
    entityId: id,
    beforeState: snapshot(before),
    afterState: snapshot(after),
  };
}

export async function generateContract(db: Db, actor: LoanActor, id: string) {
  assertLoanRole(actor, ["TREASURER", "BOARD"]);
  await lockApplication(db, id);
  const before = await getApplication(id, actor, db);
  await createContract(db, before);
  const after = await getApplication(id, actor, db);
  return {
    result: snapshot(after.contract),
    entityId: after.contract!.id,
    beforeState: snapshot(before.contract),
    afterState: snapshot(after.contract),
  };
}

export async function signContract(
  db: Db,
  actor: LoanActor,
  id: string,
  input: z.infer<typeof signatureSchema>,
  metadata: RequestMetadata,
) {
  assertLoanRole(actor, ["CLIENT"]);
  const pointer = await db.loanContract.findUnique({
    where: { id },
    select: { loanApplicationId: true },
  });
  if (!pointer) throw new ApiError("Contract not found.", 404);
  await lockApplication(db, pointer.loanApplicationId);
  const application = await getApplication(
    pointer.loanApplicationId,
    actor,
    db,
  );
  const contract = await db.loanContract.findUniqueOrThrow({ where: { id } });
  if (
    application.status !== "APPROVED" ||
    contract.status !== "AWAITING_SIGNATURE"
  )
    throw new ApiError("This contract is no longer awaiting a signature.", 409);
  const member = await db.member.findUnique({
    where: { id: application.memberId },
    select: { status: true },
  });
  if (member?.status !== "ACTIVE")
    throw new ApiError("An active membership is required to sign.", 403);
  if (
    input.documentHash !== contract.documentHash ||
    sha256(contract.documentPdf) !== contract.documentHash
  )
    throw new ApiError(
      "The contract could not be verified. Reload it before signing.",
      409,
    );
  const terms = contract.terms as unknown as ContractTerms;
  const normalize = (name: string) =>
    name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (normalize(input.typedName) !== normalize(terms.memberName))
    throw new ApiError("Type your full name exactly as shown on the contract.");
  const png = decodeSignature(input.signature);
  const signedAt = new Date();
  const signing = {
    signedName: input.typedName,
    memberSignedAt: signedAt,
    signatureHash: sha256(png),
    signingIpAddress: metadata.ipAddress,
    signingUserAgent: metadata.userAgent,
    consentVersion: SIGNATURE_CONSENT_VERSION,
  };
  await db.loanContract.update({
    where: { id },
    data: { status: "SIGNED", memberSignaturePng: png, ...signing },
  });
  return {
    result: { id, status: "SIGNED" },
    entityId: id,
    beforeState: {
      status: contract.status,
      documentHash: contract.documentHash,
    },
    afterState: snapshot({
      status: "SIGNED",
      documentHash: contract.documentHash,
      memberId: application.memberId,
      signatureUrl: `/api/contracts/${id}/signature`,
      ...signing,
    }),
  };
}

export async function disburseApplication(
  db: Db,
  actor: LoanActor,
  id: string,
  password: string,
) {
  assertLoanRole(actor, ["TREASURER"]);
  const attempts = await db.auditLog.count({
    where: {
      actorId: actor.id,
      action: "DISBURSE",
      status: "FAILURE",
      createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
    },
  });
  if (attempts >= 8)
    throw new ApiError(
      "Too many failed disbursement attempts. Wait ten minutes before retrying.",
      429,
    );
  const user = await db.user.findUnique({
    where: { id: actor.id },
    select: { passwordHash: true },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash)))
    throw new ApiError("Password confirmation failed.", 403);
  await lockApplication(db, id);
  const application = await getApplication(id, actor, db);
  if (actor.memberId === application.memberId)
    throw new ApiError("You cannot disburse your own loan.", 403);
  if (application.loan)
    throw new ApiError("This loan has already been disbursed.", 409);
  if (
    application.status !== "APPROVED" ||
    application.contract?.status !== "SIGNED" ||
    !application.approvalSteps.length ||
    application.approvalSteps.some((step) => step.decision !== "APPROVED")
  ) {
    throw new ApiError(
      "All approvals and the member's signature are required before disbursement.",
      409,
    );
  }
  const contract = await db.loanContract.findUniqueOrThrow({
    where: { id: application.contract.id },
  });
  if (
    !contract.memberSignaturePng ||
    sha256(contract.memberSignaturePng) !== contract.signatureHash ||
    sha256(contract.documentPdf) !== contract.documentHash
  ) {
    throw new ApiError("Contract integrity verification failed.", 409);
  }
  const accounts = await db.$queryRaw<
    {
      id: string;
      balance: Prisma.Decimal;
      status: string;
      memberStatus: string;
    }[]
  >`
    SELECT a."id", a."balance", a."status", m."status" AS "memberStatus"
    FROM "hlusca"."SavingsAccount" a JOIN "hlusca"."Member" m ON m."id" = a."memberId"
    WHERE a."memberId" = ${application.memberId} FOR UPDATE OF a, m`;
  const account = accounts[0];
  if (
    !account ||
    account.status !== "ACTIVE" ||
    account.memberStatus !== "ACTIVE"
  )
    throw new ApiError(
      "An active member and savings account are required.",
      409,
    );
  if (
    application.amountRequested.gt(
      new Prisma.Decimal(account.balance).mul(application.maxMultipleOfSavings),
    )
  )
    throw new ApiError(
      "Savings no longer meet the agreed loan eligibility. Restore savings before disbursement.",
      409,
    );
  const now = new Date();
  const quote = loanQuote({
    principal: application.amountRequested.toString(),
    interestRate: application.interestRate.toString(),
    interestMethod: application.interestMethod,
    termMonths: application.termMonths,
    processingFeePercent: application.processingFeePercent.toString(),
    disbursementDate: now,
  });
  const balanceAfter = new Prisma.Decimal(account.balance).plus(
    quote.netDisbursement,
  );
  await db.savingsAccount.update({
    where: { id: account.id },
    data: { balance: balanceAfter },
  });
  const transaction = await db.transaction.create({
    data: {
      savingsAccountId: account.id,
      type: "LOAN_DISBURSEMENT",
      amount: quote.netDisbursement,
      balanceAfter,
      reference: `LOAN-${application.id}`,
      narrative: `${application.loanTypeName}: principal UGX ${application.amountRequested.toFixed(2)}, fee withheld UGX ${quote.processingFee}`,
      performedById: actor.id,
    },
  });
  const loan = await db.loan.create({
    data: {
      loanApplicationId: id,
      memberId: application.memberId,
      contractId: application.contract.id,
      principal: application.amountRequested,
      interestRate: application.interestRate,
      interestMethod: application.interestMethod,
      termMonths: application.termMonths,
      processingFee: quote.processingFee,
      netDisbursement: quote.netDisbursement,
      disbursementDate: now,
      disbursedById: actor.id,
      disbursementTransactionId: transaction.id,
      outstandingBalance: quote.totalRepayable,
      schedule: {
        create: quote.schedule.map((row) => ({
          ...row,
          dueDate: new Date(`${row.dueDate}T00:00:00Z`),
          status: new Prisma.Decimal(row.totalDue).isZero() ? "PAID" : "PENDING",
        })),
      },
    },
  });
  await notifyMember(
    db,
    application.memberId,
    `Your ${application.loanTypeName} loan was disbursed. UGX ${quote.netDisbursement} has been credited to your savings. Your repayment schedule is available in Loans.`,
  );
  return {
    result: snapshot(loan),
    entityId: loan.id,
    beforeState: {
      applicationId: id,
      savingsBalance: account.balance.toString(),
      contractStatus: "SIGNED",
    },
    afterState: snapshot({
      loan,
      transaction,
      schedule: quote.schedule,
      savingsBalance: balanceAfter.toString(),
    }),
  };
}

export async function getContractFile(
  id: string,
  actor: LoanActor,
  signature = false,
) {
  const contract = await prisma.loanContract.findFirst({
    where: {
      id,
      ...(actor.role === "CLIENT"
        ? { application: { memberId: actor.memberId ?? "" } }
        : {}),
    },
    select: { documentPdf: !signature, memberSignaturePng: signature },
  });
  const data = signature ? contract?.memberSignaturePng : contract?.documentPdf;
  if (!data) throw new ApiError("Document not found.", 404);
  return data;
}

export async function getLoanSchedule(id: string, actor: LoanActor) {
  const loan = await prisma.loan.findFirst({
    where: {
      id,
      ...(actor.role === "CLIENT" ? { memberId: actor.memberId ?? "" } : {}),
    },
    include: { schedule: { orderBy: { installmentNumber: "asc" } } },
  });
  if (!loan) throw new ApiError("Loan not found.", 404);
  return loan.schedule;
}
