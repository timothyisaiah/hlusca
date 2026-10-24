BEGIN;
SET LOCAL search_path TO "hlusca";

-- CreateEnum
CREATE TYPE "EarningsRunStatus" AS ENUM ('PROPOSED', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "EarningsRun" (
    "id" TEXT NOT NULL,
    "month" CHAR(7) NOT NULL,
    "periodEnd" DATE NOT NULL,
    "interestCollected" DECIMAL(18,2) NOT NULL,
    "memberSharePercent" DECIMAL(5,2) NOT NULL,
    "memberPool" DECIMAL(18,2) NOT NULL,
    "reserveAmount" DECIMAL(18,2) NOT NULL,
    "forfeitedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "calculationMethod" TEXT NOT NULL DEFAULT 'DAILY_MINIMUM_BALANCE_INTEREST_ATTRIBUTION',
    "calculationSnapshot" JSONB NOT NULL,
    "status" "EarningsRunStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposedById" TEXT NOT NULL,
    "proposedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedById" TEXT,
    "postedAt" TIMESTAMPTZ(3),
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),

    CONSTRAINT "EarningsRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarningsRunLoan" (
    "runId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "interestRecognized" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "EarningsRunLoan_pkey" PRIMARY KEY ("runId","loanId")
);

-- CreateTable
CREATE TABLE "EarningsAllocation" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "savingsAccountId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "earningDays" INTEGER NOT NULL,
    "forfeited" BOOLEAN NOT NULL DEFAULT false,
    "transactionId" TEXT,

    CONSTRAINT "EarningsAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EarningsRun_status_month_idx" ON "EarningsRun"("status", "month");

-- CreateIndex
CREATE INDEX "EarningsRun_proposedById_idx" ON "EarningsRun"("proposedById");

-- CreateIndex
CREATE INDEX "EarningsRun_postedById_idx" ON "EarningsRun"("postedById");

-- CreateIndex
CREATE INDEX "EarningsRun_cancelledById_idx" ON "EarningsRun"("cancelledById");

-- CreateIndex
CREATE INDEX "EarningsRunLoan_loanId_idx" ON "EarningsRunLoan"("loanId");

-- CreateIndex
CREATE UNIQUE INDEX "EarningsAllocation_transactionId_key" ON "EarningsAllocation"("transactionId");

-- CreateIndex
CREATE INDEX "EarningsAllocation_memberId_idx" ON "EarningsAllocation"("memberId");

-- CreateIndex
CREATE INDEX "EarningsAllocation_savingsAccountId_memberId_idx" ON "EarningsAllocation"("savingsAccountId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "EarningsAllocation_runId_memberId_key" ON "EarningsAllocation"("runId", "memberId");

-- AddForeignKey
ALTER TABLE "EarningsRun" ADD CONSTRAINT "EarningsRun_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningsRun" ADD CONSTRAINT "EarningsRun_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningsRun" ADD CONSTRAINT "EarningsRun_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningsRunLoan" ADD CONSTRAINT "EarningsRunLoan_runId_fkey" FOREIGN KEY ("runId") REFERENCES "EarningsRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningsRunLoan" ADD CONSTRAINT "EarningsRunLoan_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningsAllocation" ADD CONSTRAINT "EarningsAllocation_runId_fkey" FOREIGN KEY ("runId") REFERENCES "EarningsRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningsAllocation" ADD CONSTRAINT "EarningsAllocation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningsAllocation" ADD CONSTRAINT "EarningsAllocation_savingsAccountId_memberId_fkey" FOREIGN KEY ("savingsAccountId", "memberId") REFERENCES "SavingsAccount"("id", "memberId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningsAllocation" ADD CONSTRAINT "EarningsAllocation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One live run per month and at most one open proposal, so interest already
-- shared (the sum of POSTED runs per loan) is always unambiguous.
CREATE UNIQUE INDEX "EarningsRun_month_live_key" ON "EarningsRun" ("month") WHERE status <> 'CANCELLED';
CREATE UNIQUE INDEX "EarningsRun_single_proposal_key" ON "EarningsRun" ((true)) WHERE status = 'PROPOSED';

ALTER TABLE "EarningsRun" ADD CONSTRAINT "EarningsRun_amounts_check" CHECK (
  month ~ '^\d{4}-(0[1-9]|1[0-2])$'
  AND "periodEnd" = (to_date(month || '-01', 'YYYY-MM-DD') + INTERVAL '1 month' - INTERVAL '1 day')::date
  AND "interestCollected" > 0
  AND "memberSharePercent" BETWEEN 0 AND 100
  AND "memberPool" >= 0 AND "reserveAmount" >= 0 AND "forfeitedAmount" >= 0
  AND "memberPool" + "reserveAmount" = "interestCollected"
  AND "forfeitedAmount" <= "memberPool"
  AND jsonb_typeof("calculationSnapshot") = 'object'
);
ALTER TABLE "EarningsRun" ADD CONSTRAINT "EarningsRun_workflow_check" CHECK (
  (status = 'PROPOSED' AND "postedById" IS NULL AND "postedAt" IS NULL AND "cancelledById" IS NULL AND "cancelledAt" IS NULL AND "forfeitedAmount" = 0)
  OR (status = 'POSTED' AND "postedById" IS NOT NULL AND "postedAt" IS NOT NULL AND "cancelledById" IS NULL AND "cancelledAt" IS NULL)
  OR (status = 'CANCELLED' AND "cancelledById" IS NOT NULL AND "cancelledAt" IS NOT NULL AND "postedById" IS NULL AND "postedAt" IS NULL AND "forfeitedAmount" = 0)
);
ALTER TABLE "EarningsRunLoan" ADD CONSTRAINT "EarningsRunLoan_amount_check" CHECK ("interestRecognized" > 0);
ALTER TABLE "EarningsAllocation" ADD CONSTRAINT "EarningsAllocation_amount_check" CHECK (
  amount >= 0 AND "earningDays" >= 0
  AND ((forfeited OR amount = 0) = ("transactionId" IS NULL))
);

COMMIT;
