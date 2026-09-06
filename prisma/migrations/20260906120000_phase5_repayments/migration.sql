BEGIN;
SET LOCAL search_path TO "hlusca";

-- CreateEnum
CREATE TYPE "LoanPaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY');

-- AlterTable
ALTER TABLE "LoanSchedule" ADD COLUMN     "interestPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "principalPaid" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LoanPayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "paymentDate" DATE NOT NULL,
    "method" "LoanPaymentMethod" NOT NULL,
    "reference" VARCHAR(100) NOT NULL,
    "targetInstallmentNumber" INTEGER,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanPaymentAllocation" (
    "paymentId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "principalAmount" DECIMAL(18,2) NOT NULL,
    "interestAmount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "LoanPaymentAllocation_pkey" PRIMARY KEY ("paymentId","scheduleId")
);

-- CreateIndex
CREATE INDEX "LoanPayment_loanId_paymentDate_createdAt_id_idx" ON "LoanPayment"("loanId", "paymentDate", "createdAt", "id");

-- CreateIndex
CREATE INDEX "LoanPayment_recordedById_idx" ON "LoanPayment"("recordedById");

-- CreateIndex
CREATE UNIQUE INDEX "LoanPayment_id_loanId_key" ON "LoanPayment"("id", "loanId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanPayment_loanId_reference_key" ON "LoanPayment"("loanId", "reference");

-- CreateIndex
CREATE INDEX "LoanPaymentAllocation_scheduleId_loanId_idx" ON "LoanPaymentAllocation"("scheduleId", "loanId");

-- CreateIndex
CREATE INDEX "LoanPaymentAllocation_loanId_idx" ON "LoanPaymentAllocation"("loanId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanSchedule_id_loanId_key" ON "LoanSchedule"("id", "loanId");

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPaymentAllocation" ADD CONSTRAINT "LoanPaymentAllocation_paymentId_loanId_fkey" FOREIGN KEY ("paymentId", "loanId") REFERENCES "LoanPayment"("id", "loanId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPaymentAllocation" ADD CONSTRAINT "LoanPaymentAllocation_scheduleId_loanId_fkey" FOREIGN KEY ("scheduleId", "loanId") REFERENCES "LoanSchedule"("id", "loanId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_amount_check" CHECK ("amount" > 0),
  ADD CONSTRAINT "LoanPayment_reference_check" CHECK ("reference" = upper(btrim("reference")) AND length("reference") > 0),
  ADD CONSTRAINT "LoanPayment_target_check" CHECK ("targetInstallmentNumber" BETWEEN 1 AND 360);
ALTER TABLE "LoanPaymentAllocation" ADD CONSTRAINT "LoanPaymentAllocation_amounts_check"
  CHECK ("principalAmount" >= 0 AND "interestAmount" >= 0 AND "principalAmount" + "interestAmount" > 0);
ALTER TABLE "LoanSchedule" ADD CONSTRAINT "LoanSchedule_paid_check"
  CHECK ("principalPaid" BETWEEN 0 AND "principalDue" AND "interestPaid" BETWEEN 0 AND "interestDue");

-- A rounded zero-value installment has no debt to collect.
UPDATE "LoanSchedule" SET status = 'PAID' WHERE "totalDue" = 0 AND status = 'PENDING';

CREATE FUNCTION "reject_loan_payment_changes"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Loan payment receipts are immutable';
END;
$$;
CREATE TRIGGER "LoanPayment_immutable" BEFORE UPDATE OR DELETE ON "LoanPayment"
  FOR EACH ROW EXECUTE FUNCTION "reject_loan_payment_changes"();

COMMIT;
