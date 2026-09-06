import { z } from "zod";

export type LoanStatementRow = {
  id: string;
  date: string;
  type: "DISBURSEMENT" | "PAYMENT";
  reference: string;
  method: string | null;
  principal: string;
  interest: string;
  amount: string;
  balance: string;
  allocations: {
    installmentNumber: number;
    principal: string;
    interest: string;
  }[];
};
export type LoanStatementSchedule = {
  id: string;
  installmentNumber: number;
  dueDate: string;
  principalDue: string;
  interestDue: string;
  totalDue: string;
  principalPaid: string;
  interestPaid: string;
  totalPaid: string;
  remainingDue: string;
  status: string;
};
export type LoanStatement = {
  loanId: string;
  applicationId: string;
  memberNumber: string;
  memberName: string;
  loanTypeName: string;
  status: string;
  disbursementDate: string;
  today: string;
  principal: string;
  totalInterest: string;
  totalRepayable: string;
  totalPaid: string;
  outstandingBalance: string;
  rows: LoanStatementRow[];
  schedule: LoanStatementSchedule[];
};
export const statementFiltersSchema = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    type: z.enum(["DISBURSEMENT", "PAYMENT"]).optional(),
    query: z.string().trim().max(100).default(""),
    page: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .refine(
    (input) => !input.from || !input.to || input.from <= input.to,
    "The start date must not be after the end date.",
  );
export type StatementFilters = z.infer<typeof statementFiltersSchema>;
export function filterStatementRows(
  rows: LoanStatementRow[],
  filters: StatementFilters,
) {
  return rows.filter(
    (row) =>
      (!filters.from || row.date >= filters.from) &&
      (!filters.to || row.date <= filters.to) &&
      (!filters.type || row.type === filters.type) &&
      (!filters.query ||
        row.reference.toLowerCase().includes(filters.query.toLowerCase())),
  );
}
