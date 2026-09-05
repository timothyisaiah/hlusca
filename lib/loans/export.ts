import type { ApplicationRecord } from "./types";
import { buildTextPdf } from "../pdf/loan-contract";

function csvCell(value: string) {
  // Quoting alone does not neutralize spreadsheet formulas in user-entered names.
  const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function applicationsCsv(applications: ApplicationRecord[]) {
  return [
    [
      "Application",
      "Member number",
      "Member name",
      "Loan type",
      "Amount (UGX)",
      "Term (months)",
      "Status",
      "Submitted (UTC)",
      "Rejection reason",
    ],
    ...applications.map((app) => [
      app.id,
      app.member.memberNumber,
      `${app.member.firstName} ${app.member.lastName}`,
      app.loanTypeName,
      app.amountRequested,
      String(app.termMonths),
      app.status,
      app.submittedAt,
      app.rejectionReason ?? "",
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

export function applicationsPdf(applications: ApplicationRecord[]) {
  return buildTextPdf([
    "HLUSCA LOAN APPLICATIONS",
    `Generated (UTC): ${new Date().toISOString()}`,
    "",
    ...applications.flatMap((app) => [
      `${app.member.memberNumber} | ${app.member.firstName} ${app.member.lastName}`,
      `${app.loanTypeName} | UGX ${app.amountRequested} | ${app.termMonths} months | ${app.status}`,
      `Application: ${app.id} | Submitted: ${app.submittedAt.slice(0, 10)}`,
      ...(app.rejectionReason
        ? [`Rejection reason: ${app.rejectionReason}`]
        : []),
      "",
    ]),
    ...(applications.length ? [] : ["No matching applications."]),
  ]);
}
