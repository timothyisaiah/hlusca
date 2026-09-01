import { describe, expect, it, vi } from "vitest";

import { buildSavingsExportFilename, buildTransactionsCsv } from "@/lib/savings/export";
import { buildTransactionLedgerPdf } from "@/lib/pdf";
import type {
  SavingsLedgerSummary,
  SavingsMemberListItem,
  SavingsTransactionRecord,
} from "@/lib/savings/types";

const member: SavingsMemberListItem = {
  id: "member-1",
  memberNumber: "HLUSCA-000001",
  firstName: "Rose",
  lastName: "Ayo",
  status: "ACTIVE",
  username: "rose",
  account: {
    id: "account-1",
    accountNumber: "SAV-000001",
    balance: "160.00",
    status: "ACTIVE",
    openedAt: "2026-09-01T10:00:00.000Z",
  },
  lastTransactionAt: "2026-09-01T10:00:00.000Z",
  lastTransactionType: "DEPOSIT",
};

const summary: SavingsLedgerSummary = {
  currentBalance: "160.00",
  totalDeposited: "160.00",
  totalWithdrawn: "0.00",
  netFlow: "160.00",
  transactionCount: 1,
  lastTransactionAt: "2026-09-01T10:00:00.000Z",
  depositShare: 100,
};

const transactions: SavingsTransactionRecord[] = [
  {
    id: "txn-1",
    type: "DEPOSIT",
    amount: "160.00",
    balanceAfter: "160.00",
    reference: "RCPT-9",
    narrative: "Opening contribution",
    createdAt: "2026-09-01T10:00:00.000Z",
    performedBy: {
      id: "user-1",
      username: "treasurer",
      role: "TREASURER",
      label: "treasurer",
    },
    member: {
      id: "member-1",
      memberNumber: "HLUSCA-000001",
      name: "Rose Ayo",
      status: "ACTIVE",
    },
  },
];

describe("savings exports", () => {
  it("builds a dated export filename", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T12:00:00.000Z"));

    expect(buildSavingsExportFilename("HLUSCA-000001", "csv")).toBe(
      "hlusca-hlusca-000001-transactions-2026-09-01.csv",
    );

    vi.useRealTimers();
  });

  it("renders member transactions to CSV", () => {
    const csv = buildTransactionsCsv(member, transactions);

    expect(csv).toContain('"Member Number"');
    expect(csv).toContain('"HLUSCA-000001"');
    expect(csv).toContain('"Deposit"');
    expect(csv).toContain('"UGX 160.00"');
  });

  it("builds a valid PDF payload header for ledger exports", () => {
    const pdf = buildTransactionLedgerPdf({
      memberName: "Rose Ayo",
      memberNumber: "HLUSCA-000001",
      generatedAt: new Date("2026-09-01T12:00:00.000Z"),
      summary,
      transactions,
    });

    expect(Buffer.from(pdf).toString("utf8", 0, 8)).toContain("%PDF");
  });
});
