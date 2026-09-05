import type {
  InterestMethod,
  LoanApplicationStatus,
  LoanContractStatus,
  LoanDecision,
  UserRole,
} from "@prisma/client";
import type { ScheduleInstallment } from "./schedule";

export interface LoanTypeRecord {
  id: string;
  name: string;
  interestMethod: InterestMethod;
  interestRate: string;
  maxTermMonths: number;
  maxMultipleOfSavings: string;
  processingFeePercent: string;
  active: boolean;
}
export interface ContractTerms {
  version: "1";
  applicationId: string;
  memberName: string;
  memberNumber: string;
  loanTypeName: string;
  principal: string;
  interestRate: string;
  interestMethod: InterestMethod;
  termMonths: number;
  processingFeePercent: string;
  processingFee: string;
  netDisbursement: string;
  totalInterest: string;
  totalRepayable: string;
  generatedAt: string;
  schedule: ScheduleInstallment[];
  conditions: string[];
}
export interface ApplicationRecord {
  id: string;
  memberId: string;
  member: { memberNumber: string; firstName: string; lastName: string };
  loanTypeName: string;
  amountRequested: string;
  termMonths: number;
  purpose: string;
  status: LoanApplicationStatus;
  interestRate: string;
  interestMethod: InterestMethod;
  processingFeePercent: string;
  boardApprovalThreshold: string;
  submittedAt: string;
  rejectionReason: string | null;
  approvalSteps: {
    id: string;
    stepNumber: number;
    approverRole: UserRole;
    decision: LoanDecision;
    comment: string | null;
    decidedAt: string | null;
  }[];
  contract: {
    id: string;
    status: LoanContractStatus;
    documentHash: string;
    generatedAt: string;
    memberSignedAt: string | null;
    signedName: string | null;
    terms: ContractTerms;
  } | null;
  loan: {
    id: string;
    status: string;
    principal: string;
    outstandingBalance: string;
    disbursementDate: string;
    netDisbursement: string;
    processingFee: string;
  } | null;
}
export interface LoanWorkspace {
  applications: ApplicationRecord[];
  total: number;
  page: number;
  pageSize: number;
}
export interface EligibilityPreview {
  eligible: boolean;
  reasons: string[];
  savingsBalance: string;
  maximumAmount: string;
  approvalRoles: UserRole[];
  processingFee: string;
  netDisbursement: string;
  totalInterest: string;
  totalRepayable: string;
  schedule: ScheduleInstallment[];
}
