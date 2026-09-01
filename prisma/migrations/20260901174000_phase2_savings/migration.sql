SET search_path TO "hlusca";

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DEPOSIT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WITHDRAW';

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'TransactionType'
  ) THEN
    CREATE TYPE "TransactionType" AS ENUM (
      'DEPOSIT',
      'WITHDRAWAL',
      'INTEREST',
      'DIVIDEND',
      'LOAN_DISBURSEMENT',
      'LOAN_REPAYMENT'
    );
  END IF;
END $$;

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "savingsAccountId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balanceAfter" DECIMAL(18,2) NOT NULL,
    "reference" TEXT,
    "narrative" TEXT,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_savingsAccountId_createdAt_idx" ON "Transaction"("savingsAccountId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Transaction_performedById_createdAt_idx" ON "Transaction"("performedById", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Transaction_type_createdAt_idx" ON "Transaction"("type", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_savingsAccountId_fkey" FOREIGN KEY ("savingsAccountId") REFERENCES "SavingsAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
