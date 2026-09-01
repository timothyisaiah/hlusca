import { DEFAULT_CURRENCY } from "../constants";
import type { SavingsLedgerSummary, SavingsTransactionRecord } from "../savings/types";
import { formatDateTime, titleCase } from "../utils";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN = 40;
const START_Y = 804;
const LINE_HEIGHT = 14;
const ROWS_PER_PAGE = 44;

function formatPlainCurrency(value: string) {
  const amount = Number.parseFloat(value);

  return `${DEFAULT_CURRENCY} ${new Intl.NumberFormat("en-UG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)}`;
}

function padCell(value: string, width: number, alignment: "left" | "right" = "left") {
  const normalized =
    value.length > width ? `${value.slice(0, Math.max(0, width - 3))}...` : value;
  return alignment === "right"
    ? normalized.padStart(width, " ")
    : normalized.padEnd(width, " ");
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPageContent(lines: string[]) {
  const commands = ["BT", "/F1 10 Tf", `${PAGE_MARGIN} ${START_Y} Td`];

  for (const [index, line] of lines.entries()) {
    if (index > 0) {
      commands.push(`0 -${LINE_HEIGHT} Td`);
    }

    commands.push(`(${escapePdfText(line)}) Tj`);
  }

  commands.push("ET");

  return commands.join("\n");
}

function chunkLines(lines: string[]) {
  const pages: string[][] = [];

  for (let index = 0; index < lines.length; index += ROWS_PER_PAGE) {
    pages.push(lines.slice(index, index + ROWS_PER_PAGE));
  }

  return pages;
}

export function buildTransactionLedgerPdf(input: {
  memberName: string;
  memberNumber: string;
  generatedAt: Date;
  summary: SavingsLedgerSummary;
  transactions: SavingsTransactionRecord[];
}) {
  const headerLines = [
    "HLUSCA SAVINGS LEDGER",
    `Member: ${input.memberName}`,
    `Member number: ${input.memberNumber}`,
    `Generated: ${formatDateTime(input.generatedAt)}`,
    `Current balance: ${formatPlainCurrency(input.summary.currentBalance)}`,
    `Total deposited: ${formatPlainCurrency(input.summary.totalDeposited)}`,
    `Total withdrawn: ${formatPlainCurrency(input.summary.totalWithdrawn)}`,
    "",
    [
      padCell("Date", 20),
      padCell("Type", 18),
      padCell("Amount", 16, "right"),
      padCell("Balance", 16, "right"),
      padCell("Reference", 18),
      padCell("By", 14),
    ].join(" "),
    "-".repeat(107),
  ];

  const transactionLines = input.transactions.map((transaction) =>
    [
      padCell(formatDateTime(transaction.createdAt), 20),
      padCell(titleCase(transaction.type), 18),
      padCell(formatPlainCurrency(transaction.amount), 16, "right"),
      padCell(formatPlainCurrency(transaction.balanceAfter), 16, "right"),
      padCell(transaction.reference ?? transaction.narrative ?? "-", 18),
      padCell(transaction.performedBy?.label ?? "-", 14),
    ].join(" "),
  );

  const lines = headerLines.concat(
    transactionLines.length > 0 ? transactionLines : ["No savings transactions recorded yet."],
  );

  const pages = chunkLines(lines);
  const fontObjectId = 3 + pages.length * 2;
  const objects: string[] = [];
  const pageObjectIds: number[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    pageObjectIds.push(3 + pageIndex * 2);
  }

  objects.push(
    `<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectIds
      .map((pageId) => `${pageId} 0 R`)
      .join(" ")}] >>`,
  );

  for (const [pageIndex, pageLines] of pages.entries()) {
    const pageObjectId = 3 + pageIndex * 2;
    const contentObjectId = pageObjectId + 1;
    const content = buildPageContent(pageLines);

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );
    objects.push(
      `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
    );
  }

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");

  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (const offset of offsets.slice(1)) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}
