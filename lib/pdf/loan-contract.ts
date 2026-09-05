import type { ContractTerms } from "../loans/types";

// A small, deterministic PDF writer, matching the existing ledger's dependency-free
// approach. Courier at 9pt fits 90 columns within A4 margins.
function pdfText(value: string) {
  return value
    .replace(/[\r\n\t]/g, " ")
    .replace(
      /[^\x20-\x7e\xa0-\xff]/gu,
      (character) =>
        `[U+${character.codePointAt(0)!.toString(16).toUpperCase()}]`,
    );
}

export function buildTextPdf(input: string[]) {
  const lines = input.flatMap((line) => {
    if (line === "\f") return [line];
    let text = pdfText(line);
    const result: string[] = [];
    while (text.length > 90) {
      const space = text.lastIndexOf(" ", 90);
      const boundary = space > 0 ? space : 90;
      result.push(text.slice(0, boundary));
      text = text.slice(boundary).trimStart();
    }
    return [...result, text];
  });
  const pages: string[][] = [];
  let page: string[] = [];
  for (const line of lines) {
    if (line === "\f" || page.length === 48) {
      if (page.length) pages.push(page);
      page = [];
    }
    if (line !== "\f") page.push(line);
  }
  if (page.length) pages.push(page);
  if (!pages.length) pages.push([""]);
  const fontId = 3 + pages.length * 2;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ")}] >>`,
  ];
  for (const [index, page] of pages.entries()) {
    const commands = [
      "BT",
      "/F1 9 Tf",
      "40 795 Td",
      ...page.flatMap((line, i) => [
        ...(i ? ["0 -14 Td"] : []),
        `(${line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")}) Tj`,
      ]),
      "ET",
      `BT /F1 9 Tf 40 28 Td (HLUSCA | Page ${index + 1} of ${pages.length}) Tj ET`,
    ].join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${4 + index * 2} 0 R >>`,
    );
    objects.push(
      `<< /Length ${Buffer.byteLength(commands, "latin1")} >>\nstream\n${commands}\nendstream`,
    );
  }
  objects.push(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>",
  );
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [i, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf, "latin1"));
}

export function buildLoanContractPdf(terms: ContractTerms) {
  return buildTextPdf([
    "HLUSCA LOAN AGREEMENT",
    "",
    `Application: ${terms.applicationId}`,
    `Member: ${terms.memberName} (${terms.memberNumber})`,
    `Product: ${terms.loanTypeName}`,
    `Generated (UTC): ${terms.generatedAt}`,
    "",
    `Principal: UGX ${terms.principal}`,
    `Annual interest: ${terms.interestRate}% | Method: ${terms.interestMethod.replaceAll("_", " ")}`,
    `Term: ${terms.termMonths} monthly installments`,
    `Processing fee: ${terms.processingFeePercent}% = UGX ${terms.processingFee}`,
    `Net credit to savings at disbursement: UGX ${terms.netDisbursement}`,
    `Total scheduled interest: UGX ${terms.totalInterest}`,
    `Total scheduled repayments: UGX ${terms.totalRepayable}`,
    "",
    "TERMS",
    ...terms.conditions.flatMap((condition, i) => [
      `${i + 1}. ${condition}`,
      "",
    ]),
    "\f",
    `HLUSCA LOAN AGREEMENT | ${terms.applicationId}`,
    `Member: ${terms.memberName} (${terms.memberNumber})`,
    "",
    "REPAYMENT SCHEDULE PREVIEW (all amounts UGX)",
    "Dates assume disbursement on the generation date. Actual dates start at disbursement.",
    "No. Date             Principal        Interest           Total       Principal left",
    ...terms.schedule.map(
      (row) =>
        `${String(row.installmentNumber).padStart(3)} ${row.dueDate} ${row.principalDue.padStart(17)} ${row.interestDue.padStart(15)} ${row.totalDue.padStart(15)} ${row.principalBalanceAfter.padStart(20)}`,
    ),
    "",
    "ELECTRONIC ACCEPTANCE",
    "Acceptance is recorded with your typed full name, drawn signature, document hash,",
    "timestamp, IP address and browser information in the protected signature record.",
    "The original agreement remains unchanged after signing. Retain this document.",
  ]);
}
