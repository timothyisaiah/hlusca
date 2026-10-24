import type { EarningsRunStatus } from "@prisma/client";

import type { EarningsShare } from "./calculation";

export type EarningsSnapshotShare = EarningsShare & { accountActive: boolean };

export interface EarningsSnapshot {
  method: string;
  firstDay: string | null;
  lastDay: string | null;
  shares: EarningsSnapshotShare[];
  loans: { loanId: string; memberNumber: string; interest: string }[];
}

export interface EarningsRunRecord {
  id: string;
  month: string;
  periodEnd: string;
  interestCollected: string;
  memberSharePercent: string;
  memberPool: string;
  reserveAmount: string;
  forfeitedAmount: string;
  status: EarningsRunStatus;
  calculationSnapshot: EarningsSnapshot;
  proposedAt: string;
  postedAt: string | null;
  cancelledAt: string | null;
  proposedBy: { username: string | null };
  postedBy: { username: string | null } | null;
}

export interface EarningsHistoryRecord {
  id: string;
  amount: string;
  earningDays: number;
  run: { month: string; periodEnd: string; postedAt: string | null };
}

export interface MemberEarningsSummary {
  yearToDate: string;
  // Live estimate of interest collected since the last posted run, not yet
  // credited. Null when it cannot be calculated.
  accruing: string | null;
  history: EarningsHistoryRecord[];
}
