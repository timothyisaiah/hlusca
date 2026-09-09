BEGIN;
SET LOCAL search_path TO "hlusca";

-- CreateEnum
CREATE TYPE "InvestmentRiskProfile" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "MemberInvestmentStatus" AS ENUM ('ACTIVE', 'MATURED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DividendRunStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED', 'POSTED');

-- CreateTable
CREATE TABLE "InvestmentProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expectedReturnRate" DECIMAL(7,4) NOT NULL,
    "riskProfile" "InvestmentRiskProfile" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "InvestmentProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberInvestment" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "investmentProductId" TEXT NOT NULL,
    "principal" DECIMAL(18,2) NOT NULL,
    "startDate" DATE NOT NULL,
    "maturityDate" DATE NOT NULL,
    "status" "MemberInvestmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "productName" TEXT NOT NULL,
    "expectedReturnRate" DECIMAL(7,4) NOT NULL,
    "riskProfile" "InvestmentRiskProfile" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MemberInvestment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DividendRun" (
    "id" TEXT NOT NULL,
    "financialYear" INTEGER NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "totalPoolAmount" DECIMAL(18,2) NOT NULL,
    "calculationMethod" TEXT NOT NULL DEFAULT 'PRO_RATA_AVERAGE_DAILY_SAVINGS',
    "calculationSnapshot" JSONB NOT NULL,
    "runDate" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runById" TEXT NOT NULL,
    "status" "DividendRunStatus" NOT NULL DEFAULT 'PROPOSED',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMPTZ(3),
    "decisionComment" TEXT,
    "postedById" TEXT,
    "postedAt" TIMESTAMPTZ(3),

    CONSTRAINT "DividendRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DividendAllocation" (
    "id" TEXT NOT NULL,
    "dividendRunId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "savingsAccountId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "averageBalance" DECIMAL(18,2) NOT NULL,
    "transactionId" TEXT,

    CONSTRAINT "DividendAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentProduct_name_key" ON "InvestmentProduct"("name");

-- CreateIndex
CREATE INDEX "MemberInvestment_memberId_createdAt_idx" ON "MemberInvestment"("memberId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MemberInvestment_investmentProductId_idx" ON "MemberInvestment"("investmentProductId");

-- CreateIndex
CREATE INDEX "MemberInvestment_status_maturityDate_idx" ON "MemberInvestment"("status", "maturityDate");

-- CreateIndex
CREATE INDEX "DividendRun_status_runDate_idx" ON "DividendRun"("status", "runDate");

-- CreateIndex
CREATE INDEX "DividendRun_runById_idx" ON "DividendRun"("runById");

-- CreateIndex
CREATE INDEX "DividendRun_decidedById_idx" ON "DividendRun"("decidedById");

-- CreateIndex
CREATE INDEX "DividendRun_postedById_idx" ON "DividendRun"("postedById");

-- CreateIndex
CREATE UNIQUE INDEX "DividendAllocation_transactionId_key" ON "DividendAllocation"("transactionId");

-- CreateIndex
CREATE INDEX "DividendAllocation_memberId_idx" ON "DividendAllocation"("memberId");

-- CreateIndex
CREATE INDEX "DividendAllocation_savingsAccountId_memberId_idx" ON "DividendAllocation"("savingsAccountId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "DividendAllocation_dividendRunId_memberId_key" ON "DividendAllocation"("dividendRunId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "SavingsAccount_id_memberId_key" ON "SavingsAccount"("id", "memberId");

-- AddForeignKey
ALTER TABLE "MemberInvestment" ADD CONSTRAINT "MemberInvestment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberInvestment" ADD CONSTRAINT "MemberInvestment_investmentProductId_fkey" FOREIGN KEY ("investmentProductId") REFERENCES "InvestmentProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DividendRun" ADD CONSTRAINT "DividendRun_runById_fkey" FOREIGN KEY ("runById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DividendRun" ADD CONSTRAINT "DividendRun_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DividendRun" ADD CONSTRAINT "DividendRun_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DividendAllocation" ADD CONSTRAINT "DividendAllocation_dividendRunId_fkey" FOREIGN KEY ("dividendRunId") REFERENCES "DividendRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DividendAllocation" ADD CONSTRAINT "DividendAllocation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DividendAllocation" ADD CONSTRAINT "DividendAllocation_savingsAccountId_memberId_fkey" FOREIGN KEY ("savingsAccountId", "memberId") REFERENCES "SavingsAccount"("id", "memberId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DividendAllocation" ADD CONSTRAINT "DividendAllocation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "InvestmentProduct_name_lower_key" ON "InvestmentProduct" (lower(name));
CREATE UNIQUE INDEX "DividendRun_financialYear_live_key" ON "DividendRun" ("financialYear") WHERE status <> 'REJECTED';
ALTER TABLE "InvestmentProduct" ADD CONSTRAINT "InvestmentProduct_rate_check" CHECK ("expectedReturnRate" BETWEEN 0 AND 100);
ALTER TABLE "MemberInvestment" ADD CONSTRAINT "MemberInvestment_terms_check" CHECK (principal > 0 AND "maturityDate" > "startDate" AND "expectedReturnRate" BETWEEN 0 AND 100);
ALTER TABLE "DividendRun" ADD CONSTRAINT "DividendRun_period_check" CHECK (
  "totalPoolAmount" > 0 AND "financialYear" = EXTRACT(YEAR FROM "periodEnd")
  AND "periodEnd" = ("periodStart" + INTERVAL '1 year' - INTERVAL '1 day')::date
  AND "calculationMethod" = 'PRO_RATA_AVERAGE_DAILY_SAVINGS'
  AND jsonb_typeof("calculationSnapshot") = 'array'
);
-- daterange has a built-in GiST operator class; no database extension is needed.
ALTER TABLE "DividendRun" ADD CONSTRAINT "DividendRun_no_overlapping_periods"
  EXCLUDE USING gist (daterange("periodStart", "periodEnd", '[]') WITH &&) WHERE (status <> 'REJECTED');
ALTER TABLE "DividendRun" ADD CONSTRAINT "DividendRun_approval_check" CHECK (
  (status = 'PROPOSED' AND "decidedById" IS NULL AND "decidedAt" IS NULL AND "decisionComment" IS NULL AND "postedById" IS NULL AND "postedAt" IS NULL)
  OR (status IN ('APPROVED', 'REJECTED') AND "decidedById" IS NOT NULL AND "decidedById" <> "runById" AND "decidedAt" IS NOT NULL AND length("decisionComment") >= 3 AND "postedById" IS NULL AND "postedAt" IS NULL)
  OR (status = 'POSTED' AND "decidedById" IS NOT NULL AND "decidedById" <> "runById" AND "decidedAt" IS NOT NULL AND length("decisionComment") >= 3 AND "postedById" IS NOT NULL AND "postedById" <> "decidedById" AND "postedAt" IS NOT NULL)
);
ALTER TABLE "DividendAllocation" ADD CONSTRAINT "DividendAllocation_amount_check" CHECK (
  amount >= 0 AND "averageBalance" >= 0 AND ((amount = 0 AND "transactionId" IS NULL) OR (amount > 0 AND "transactionId" IS NOT NULL))
);

CREATE FUNCTION hlusca.guard_dividend_run() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF ROW(NEW."financialYear", NEW."periodStart", NEW."periodEnd", NEW."totalPoolAmount", NEW."calculationMethod", NEW."calculationSnapshot", NEW."runDate", NEW."runById")
     IS DISTINCT FROM ROW(OLD."financialYear", OLD."periodStart", OLD."periodEnd", OLD."totalPoolAmount", OLD."calculationMethod", OLD."calculationSnapshot", OLD."runDate", OLD."runById")
     OR NOT ((OLD.status = 'PROPOSED' AND NEW.status IN ('APPROVED', 'REJECTED')) OR (OLD.status = 'APPROVED' AND NEW.status = 'POSTED')) THEN
    RAISE EXCEPTION 'Dividend proposals are immutable and must follow the approval workflow';
  END IF;
  IF OLD.status = 'APPROVED' AND ROW(NEW."decidedById", NEW."decidedAt", NEW."decisionComment") IS DISTINCT FROM ROW(OLD."decidedById", OLD."decidedAt", OLD."decisionComment") THEN
    RAISE EXCEPTION 'Dividend approval is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER dividend_run_guard BEFORE UPDATE ON "DividendRun" FOR EACH ROW EXECUTE FUNCTION hlusca.guard_dividend_run();

COMMIT;
