import { describe, expect, it } from "vitest";
import { applicationsCsv } from "./export";
import { buildTextPdf } from "../pdf/loan-contract";
import type { ApplicationRecord } from "./types";

describe("loan documents and exports", () => {
  it("escapes commas, quotes, and formula-leading spreadsheet fields", () => {
    const csv = applicationsCsv([
      {
        id: "app-1",
        member: {
          memberNumber: "HLUSCA-000001",
          firstName: '=CMD("x")',
          lastName: "Ayo",
        },
        loanTypeName: "Farm, equipment",
        amountRequested: "1000",
        termMonths: 12,
        status: "REJECTED",
        submittedAt: "2026-09-05T00:00:00Z",
        rejectionReason: "@test",
      } as ApplicationRecord,
    ]);
    expect(csv).toContain('"\'=CMD(""x"") Ayo"');
    expect(csv).toContain('"Farm, equipment"');
    expect(csv).toContain('"\'@test"');
  });
  it("creates multiple A4 pages with correct PDF cross-reference byte offsets", () => {
    const pdf = Buffer.from(
      buildTextPdf(
        Array.from(
          { length: 100 },
          (_, i) => `Line ${i} (quoted) René \\ test`,
        ),
      ),
    ).toString("latin1");
    expect(pdf).toContain("/Count 3");
    expect(pdf).toContain("/MediaBox [0 0 595 842]");
    expect(pdf).toContain("\\(quoted\\)");
    const xref = Number(pdf.match(/startxref\n(\d+)/)![1]);
    expect(pdf.slice(xref, xref + 4)).toBe("xref");
    const offsets = pdf
      .slice(xref)
      .split("\n")
      .slice(3)
      .filter((line) => /^\d{10} 00000 n/.test(line));
    offsets.forEach((offset, i) =>
      expect(pdf.slice(Number(offset.slice(0, 10)))).toMatch(
        new RegExp(`^${i + 1} 0 obj`),
      ),
    );
  });
});
