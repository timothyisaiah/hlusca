import { buildTextPdf } from "../pdf/loan-contract";
import type {
  LoanStatement,
  LoanStatementRow,
  StatementFilters,
} from "./statement-types";

function csvCell(value: string) {
  const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function statementCsv(
  statement: LoanStatement,
  rows: LoanStatementRow[],
) {
  return [
    [
      "Loan",
      "Member number",
      "Member name",
      "Date",
      "Type",
      "Reference",
      "Method",
      "Principal (UGX)",
      "Interest (UGX)",
      "Amount (UGX)",
      "Running balance (UGX)",
      "Installment allocations (principal + interest)",
    ],
    ...rows.map((row) => [
      statement.loanId,
      statement.memberNumber,
      statement.memberName,
      row.date,
      row.type === "DISBURSEMENT"
        ? "Opening scheduled debt"
        : "Payment received",
      row.reference,
      row.method ?? "",
      row.principal,
      row.interest,
      row.amount,
      row.balance,
      row.allocations
        .map((a) => `#${a.installmentNumber}: ${a.principal} + ${a.interest}`)
        .join("; "),
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}
export function statementPdf(
  statement: LoanStatement,
  rows: LoanStatementRow[],
  filters: StatementFilters,
) {
  return buildTextPdf([
    "HLUSCA LOAN STATEMENT",
    `Loan: ${statement.loanId}`,
    `Member: ${statement.memberName} (${statement.memberNumber})`,
    `Product: ${statement.loanTypeName} | Status: ${statement.status}`,
    `Generated (UTC): ${new Date().toISOString()}`,
    "",
    `Original principal: UGX ${statement.principal} | Scheduled interest: UGX ${statement.totalInterest}`,
    `Total paid: UGX ${statement.totalPaid} | Current remaining balance: UGX ${statement.outstandingBalance}`,
    `Period: ${filters.from ?? "Beginning"} to ${filters.to ?? statement.today} | Type: ${filters.type ?? "All"}`,
    ...(filters.query ? [`Reference contains: ${filters.query}`] : []),
    "",
    "Opening debt includes all scheduled principal and interest. Payments reduce this debt.",
    "Principal and interest on payment rows are amounts paid, shown as positive amounts.",
    "Running balances include earlier activity excluded by the selected filters.",
    "Dates are calendar dates in Kampala. All amounts are UGX.",
    "",
    ...rows.flatMap((row) => [
      `${row.date} | ${row.type === "PAYMENT" ? "Payment received" : "Opening scheduled debt"}${row.method ? ` | ${row.method.replaceAll("_", " ")}` : ""}`,
      `Reference: ${row.reference}`,
      `Principal: ${row.principal} | Interest: ${row.interest} | Balance: ${row.balance}`,
      ...row.allocations.map(
        (a) =>
          `  Installment ${a.installmentNumber}: principal ${a.principal} + interest ${a.interest}`,
      ),
      "",
    ]),
    ...(rows.length ? [] : ["No transactions match these filters."]),
    "\f",
    `HLUSCA REPAYMENT SCHEDULE | ${statement.loanId}`,
    `Member: ${statement.memberName} (${statement.memberNumber})`,
    "Current full schedule (unaffected by statement filters). All amounts UGX.",
    "",
    ...statement.schedule.flatMap((row) => [
      `Installment ${row.installmentNumber} | Due ${row.dueDate} | ${row.status}`,
      `Principal due: ${row.principalDue} | Interest due: ${row.interestDue}`,
      `Paid: ${row.totalPaid} | Remaining: ${row.remainingDue}`,
      "",
    ]),
  ]);
}
