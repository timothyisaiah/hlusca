import type { DividendShare } from "./calculation";

export type ProductRecord = {
  id: string;
  name: string;
  description: string;
  expectedReturnRate: string;
  riskProfile: "LOW" | "MEDIUM" | "HIGH";
  active: boolean;
};
export type MemberOption = {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
};
export type InvestmentRecord = {
  id: string;
  memberId: string;
  productName: string;
  principal: string;
  expectedReturnRate: string;
  riskProfile: string;
  startDate: string;
  maturityDate: string;
  status: "ACTIVE" | "MATURED" | "CANCELLED";
  member: MemberOption;
};
export type RunRecord = {
  id: string;
  financialYear: number;
  periodStart: string;
  periodEnd: string;
  totalPoolAmount: string;
  calculationMethod: string;
  calculationSnapshot: DividendShare[];
  status: "PROPOSED" | "APPROVED" | "REJECTED" | "POSTED";
  runDate: string;
  runById: string;
  decidedAt: string | null;
  postedAt: string | null;
  decisionComment: string | null;
  runBy: { username: string | null };
  decidedBy: { username: string | null } | null;
};
export type DividendHistoryRecord = {
  id: string;
  amount: string;
  averageBalance: string;
  run: {
    financialYear: number;
    periodStart: string;
    periodEnd: string;
    postedAt: string | null;
  };
};
