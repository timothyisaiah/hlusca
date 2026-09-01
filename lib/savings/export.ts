import type { SavingsMemberListItem, SavingsTransactionRecord } from "./types";
import { DEFAULT_CURRENCY } from "../constants";
import { formatDateTime, titleCase } from "../utils";

function formatPlainCurrency(value: string) {
  const amount = Number.parseFloat(value);

  return `${DEFAULT_CURRENCY} ${new Intl.NumberFormat("en-UG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)}`;
}

export function buildSavingsExportFilename(memberNumber: string, extension: "csv" | "pdf") {
  const stamp = new Date().toISOString().slice(0, 10);
  return `hlusca-${memberNumber.toLowerCase()}-transactions-${stamp}.${extension}`;
}

export function buildTransactionsCsv(
  member: SavingsMemberListItem,
  transactions: SavingsTransactionRecord[],
) {
  const rows = [
    [
      "Member Number",
      "Member Name",
      "Date",
      "Type",
      "Amount",
      "Balance After",
      "Reference",
      "Narrative",
      "Recorded By",
      "Recorded By Role",
    ],
    ...transactions.map((transaction) => [
      member.memberNumber,
      `${member.firstName} ${member.lastName}`,
      formatDateTime(transaction.createdAt),
      titleCase(transaction.type),
      formatPlainCurrency(transaction.amount),
      formatPlainCurrency(transaction.balanceAfter),
      transaction.reference ?? "",
      transaction.narrative ?? "",
      transaction.performedBy?.label ?? "",
      transaction.performedBy?.role ?? "",
    ]),
  ];

  return rows
    .map((row) =>
      row
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
}
