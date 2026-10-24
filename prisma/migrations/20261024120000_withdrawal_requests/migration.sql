BEGIN;
SET LOCAL search_path TO "hlusca";

-- CreateEnum
CREATE TYPE "WithdrawalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'DISBURSED');

-- CreateEnum
CREATE TYPE "WithdrawalPayoutMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY');

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "savingsAccountId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "payoutMethod" "WithdrawalPayoutMethod" NOT NULL,
    "payoutDetails" VARCHAR(120),
    "reason" VARCHAR(240),
    "status" "WithdrawalRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewComment" VARCHAR(500),
    "disbursedById" TEXT,
    "disbursedAt" TIMESTAMPTZ(3),
    "transactionId" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalRequest_transactionId_key" ON "WithdrawalRequest"("transactionId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_memberId_requestedAt_idx" ON "WithdrawalRequest"("memberId", "requestedAt" DESC);

-- CreateIndex
CREATE INDEX "WithdrawalRequest_savingsAccountId_status_idx" ON "WithdrawalRequest"("savingsAccountId", "status");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_status_requestedAt_idx" ON "WithdrawalRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_requestedById_idx" ON "WithdrawalRequest"("requestedById");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_reviewedById_idx" ON "WithdrawalRequest"("reviewedById");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_disbursedById_idx" ON "WithdrawalRequest"("disbursedById");

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_savingsAccountId_memberId_fkey" FOREIGN KEY ("savingsAccountId", "memberId") REFERENCES "SavingsAccount"("id", "memberId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_disbursedById_fkey" FOREIGN KEY ("disbursedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_amount_check" CHECK (amount > 0);
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_workflow_check" CHECK (
  (status = 'PENDING' AND "reviewedById" IS NULL AND "reviewedAt" IS NULL AND "disbursedById" IS NULL AND "disbursedAt" IS NULL AND "transactionId" IS NULL AND "cancelledAt" IS NULL)
  OR (status = 'APPROVED' AND "reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "disbursedById" IS NULL AND "disbursedAt" IS NULL AND "transactionId" IS NULL AND "cancelledAt" IS NULL)
  OR (status = 'REJECTED' AND "reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL AND length("reviewComment") >= 3 AND "disbursedById" IS NULL AND "disbursedAt" IS NULL AND "transactionId" IS NULL AND "cancelledAt" IS NULL)
  OR (status = 'CANCELLED' AND "cancelledAt" IS NOT NULL AND "disbursedById" IS NULL AND "disbursedAt" IS NULL AND "transactionId" IS NULL)
  OR (status = 'DISBURSED' AND "reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "disbursedById" IS NOT NULL AND "disbursedAt" IS NOT NULL AND "transactionId" IS NOT NULL AND "cancelledAt" IS NULL)
);

COMMIT;
