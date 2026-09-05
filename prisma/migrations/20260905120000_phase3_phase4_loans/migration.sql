BEGIN;
SET LOCAL search_path TO "hlusca";

-- CreateEnum
CREATE TYPE "InterestMethod" AS ENUM ('FLAT', 'REDUCING_BALANCE');

-- CreateEnum
CREATE TYPE "LoanApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LoanDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LoanContractStatus" AS ENUM ('AWAITING_SIGNATURE', 'SIGNED', 'VOID');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'CLOSED', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "LoanScheduleStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateTable
CREATE TABLE "LoanType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "interestMethod" "InterestMethod" NOT NULL,
    "interestRate" DECIMAL(7,4) NOT NULL,
    "maxTermMonths" INTEGER NOT NULL,
    "maxMultipleOfSavings" DECIMAL(7,2) NOT NULL,
    "processingFeePercent" DECIMAL(7,4) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LoanType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanApplication" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "loanTypeId" TEXT NOT NULL,
    "amountRequested" DECIMAL(18,2) NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "LoanApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "loanTypeName" TEXT NOT NULL,
    "interestMethod" "InterestMethod" NOT NULL,
    "interestRate" DECIMAL(7,4) NOT NULL,
    "processingFeePercent" DECIMAL(7,4) NOT NULL,
    "maxMultipleOfSavings" DECIMAL(7,2) NOT NULL,
    "boardApprovalThreshold" DECIMAL(18,2) NOT NULL,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),
    "decidedById" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "LoanApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanApprovalStep" (
    "id" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "approverRole" "UserRole" NOT NULL,
    "approverId" TEXT,
    "decision" "LoanDecision" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "decidedAt" TIMESTAMPTZ(3),

    CONSTRAINT "LoanApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanContract" (
    "id" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "documentPdf" BYTEA NOT NULL,
    "documentHash" TEXT NOT NULL,
    "terms" JSONB NOT NULL,
    "generatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "LoanContractStatus" NOT NULL DEFAULT 'AWAITING_SIGNATURE',
    "memberSignedAt" TIMESTAMPTZ(3),
    "signedName" TEXT,
    "memberSignaturePng" BYTEA,
    "signatureHash" TEXT,
    "signingIpAddress" TEXT,
    "signingUserAgent" TEXT,
    "consentVersion" TEXT,

    CONSTRAINT "LoanContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "principal" DECIMAL(18,2) NOT NULL,
    "interestRate" DECIMAL(7,4) NOT NULL,
    "interestMethod" "InterestMethod" NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "processingFee" DECIMAL(18,2) NOT NULL,
    "netDisbursement" DECIMAL(18,2) NOT NULL,
    "disbursementDate" TIMESTAMPTZ(3) NOT NULL,
    "disbursedById" TEXT NOT NULL,
    "disbursementTransactionId" TEXT NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "outstandingBalance" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanSchedule" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "principalDue" DECIMAL(18,2) NOT NULL,
    "interestDue" DECIMAL(18,2) NOT NULL,
    "totalDue" DECIMAL(18,2) NOT NULL,
    "principalBalanceAfter" DECIMAL(18,2) NOT NULL,
    "status" "LoanScheduleStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "LoanSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoanType_name_key" ON "LoanType"("name");

-- CreateIndex
CREATE INDEX "LoanApplication_memberId_submittedAt_idx" ON "LoanApplication"("memberId", "submittedAt" DESC);

-- CreateIndex
CREATE INDEX "LoanApplication_status_submittedAt_idx" ON "LoanApplication"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "LoanApplication_loanTypeId_idx" ON "LoanApplication"("loanTypeId");

-- CreateIndex
CREATE INDEX "LoanApplication_decidedById_idx" ON "LoanApplication"("decidedById");

-- CreateIndex
CREATE INDEX "LoanApprovalStep_approverRole_decision_idx" ON "LoanApprovalStep"("approverRole", "decision");

-- CreateIndex
CREATE INDEX "LoanApprovalStep_approverId_idx" ON "LoanApprovalStep"("approverId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanApprovalStep_loanApplicationId_stepNumber_key" ON "LoanApprovalStep"("loanApplicationId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LoanApprovalStep_loanApplicationId_approverRole_key" ON "LoanApprovalStep"("loanApplicationId", "approverRole");

-- CreateIndex
CREATE UNIQUE INDEX "LoanContract_loanApplicationId_key" ON "LoanContract"("loanApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_loanApplicationId_key" ON "Loan"("loanApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_contractId_key" ON "Loan"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_disbursementTransactionId_key" ON "Loan"("disbursementTransactionId");

-- CreateIndex
CREATE INDEX "Loan_memberId_disbursementDate_idx" ON "Loan"("memberId", "disbursementDate" DESC);

-- CreateIndex
CREATE INDEX "Loan_status_idx" ON "Loan"("status");

-- CreateIndex
CREATE INDEX "Loan_disbursedById_idx" ON "Loan"("disbursedById");

-- CreateIndex
CREATE INDEX "LoanSchedule_status_dueDate_idx" ON "LoanSchedule"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "LoanSchedule_loanId_installmentNumber_key" ON "LoanSchedule"("loanId", "installmentNumber");

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_loanTypeId_fkey" FOREIGN KEY ("loanTypeId") REFERENCES "LoanType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApprovalStep" ADD CONSTRAINT "LoanApprovalStep_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "LoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApprovalStep" ADD CONSTRAINT "LoanApprovalStep_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanContract" ADD CONSTRAINT "LoanContract_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "LoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "LoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "LoanContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_disbursedById_fkey" FOREIGN KEY ("disbursedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_disbursementTransactionId_fkey" FOREIGN KEY ("disbursementTransactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanSchedule" ADD CONSTRAINT "LoanSchedule_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "LoanType_name_case_insensitive_key" ON "LoanType" (lower("name"));
ALTER TABLE "LoanType" ADD CONSTRAINT "LoanType_valid_terms" CHECK (
  "interestRate" BETWEEN 0 AND 100 AND "maxTermMonths" BETWEEN 1 AND 360
  AND "maxMultipleOfSavings" > 0 AND "processingFeePercent" >= 0 AND "processingFeePercent" < 100
);
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_valid_terms" CHECK (
  "amountRequested" > 0 AND "termMonths" BETWEEN 1 AND 360 AND "interestRate" BETWEEN 0 AND 100
  AND "processingFeePercent" >= 0 AND "processingFeePercent" < 100
  AND "maxMultipleOfSavings" > 0 AND "boardApprovalThreshold" > 0
  AND ("status" <> 'REJECTED' OR length(trim("rejectionReason")) >= 3 AND "rejectionReason" IS NOT NULL)
);
ALTER TABLE "LoanApprovalStep" ADD CONSTRAINT "LoanApprovalStep_valid_decision" CHECK (
  "stepNumber" > 0 AND "approverRole" IN ('TREASURER', 'BOARD')
  AND ("decision" = 'PENDING' OR ("approverId" IS NOT NULL AND "decidedAt" IS NOT NULL))
);
ALTER TABLE "LoanContract" ADD CONSTRAINT "LoanContract_signature_required" CHECK (
  "status" <> 'SIGNED' OR ("memberSignedAt" IS NOT NULL AND "signedName" IS NOT NULL
    AND "memberSignaturePng" IS NOT NULL AND "signatureHash" IS NOT NULL AND "consentVersion" IS NOT NULL)
);
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_valid_amounts" CHECK (
  "principal" > 0 AND "processingFee" >= 0 AND "netDisbursement" > 0
  AND "principal" = "processingFee" + "netDisbursement" AND "outstandingBalance" >= 0
  AND "termMonths" BETWEEN 1 AND 360 AND "interestRate" BETWEEN 0 AND 100
);
ALTER TABLE "LoanSchedule" ADD CONSTRAINT "LoanSchedule_valid_amounts" CHECK (
  "installmentNumber" > 0 AND "principalDue" >= 0 AND "interestDue" >= 0
  AND "totalDue" = "principalDue" + "interestDue" AND "principalBalanceAfter" >= 0
);

-- Preserve the exact agreement and the evidence of acceptance, including against
-- accidental writes from maintenance code. Unsigned documents are also immutable.
CREATE FUNCTION "hlusca"."protect_loan_contract"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Loan contracts cannot be deleted';
  END IF;
  IF NEW."documentPdf" IS DISTINCT FROM OLD."documentPdf"
    OR NEW."documentHash" IS DISTINCT FROM OLD."documentHash"
    OR NEW."terms" IS DISTINCT FROM OLD."terms"
    OR NEW."loanApplicationId" IS DISTINCT FROM OLD."loanApplicationId"
    OR NEW."generatedAt" IS DISTINCT FROM OLD."generatedAt"
    OR (OLD."status" IN ('SIGNED', 'VOID') AND NEW IS DISTINCT FROM OLD) THEN
    RAISE EXCEPTION 'Loan contract and signature evidence are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "LoanContract_immutable" BEFORE UPDATE OR DELETE ON "LoanContract"
  FOR EACH ROW EXECUTE FUNCTION "hlusca"."protect_loan_contract"();
COMMIT;
