import type {
  MemberStatus,
  SavingsAccountStatus,
  TransactionType,
  UserRole,
  WithdrawalPayoutMethod,
  WithdrawalRequestStatus,
} from "@prisma/client";

export interface SavingsMemberListItem {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  status: MemberStatus;
  username: string | null;
  account: {
    id: string;
    accountNumber: string;
    balance: string;
    status: SavingsAccountStatus;
    openedAt: string;
  };
  lastTransactionAt: string | null;
  lastTransactionType: TransactionType | null;
}

export interface SavingsTransactionRecord {
  id: string;
  type: TransactionType;
  amount: string;
  balanceAfter: string;
  reference: string | null;
  narrative: string | null;
  createdAt: string;
  performedBy: {
    id: string;
    username: string | null;
    role: UserRole;
    label: string;
  } | null;
  member: {
    id: string;
    memberNumber: string;
    name: string;
    status: MemberStatus;
  } | null;
}

export interface SavingsLedgerSummary {
  currentBalance: string;
  totalDeposited: string;
  totalWithdrawn: string;
  netFlow: string;
  transactionCount: number;
  lastTransactionAt: string | null;
  depositShare: number;
}

export interface SavingsLedgerPage {
  member: SavingsMemberListItem;
  summary: SavingsLedgerSummary;
  transactions: SavingsTransactionRecord[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface TreasurerSavingsSummary {
  totalSavings: string;
  activeAccounts: number;
  pendingActivations: number;
  monthlyDeposits: string;
  monthlyWithdrawals: string;
  monthlyNetFlow: string;
  monthlyTransactionCount: number;
}

export interface TreasurerSavingsWorkspace {
  summary: TreasurerSavingsSummary;
  members: SavingsMemberListItem[];
  recentTransactions: SavingsTransactionRecord[];
}

export interface ClientSavingsDashboard {
  member: SavingsMemberListItem;
  ledger: SavingsLedgerPage;
}

export interface WithdrawalRequestRecord {
  id: string;
  amount: string;
  payoutMethod: WithdrawalPayoutMethod;
  payoutDetails: string | null;
  reason: string | null;
  status: WithdrawalRequestStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewComment: string | null;
  disbursedAt: string | null;
  disbursedBy: string | null;
  transactionReference: string | null;
  cancelledAt: string | null;
  member: {
    id: string;
    memberNumber: string;
    name: string;
    accountNumber: string;
    balance: string;
  };
}

export interface MemberWithdrawalOverview {
  requests: WithdrawalRequestRecord[];
  openTotal: string;
}

export interface TreasurerWithdrawalQueue {
  open: WithdrawalRequestRecord[];
  recent: WithdrawalRequestRecord[];
}
