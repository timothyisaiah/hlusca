import { z } from "zod";
import { moneySchema } from "../loans/schemas";
import { dateNumber } from "./calculation";

export const productSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().min(3).max(2000),
    expectedReturnRate: z
      .string()
      .trim()
      .regex(/^\d{1,3}(\.\d{1,4})?$/)
      .refine(
        (value) => Number(value) <= 100,
        "Return rate cannot exceed 100%.",
      ),
    riskProfile: z.enum(["LOW", "MEDIUM", "HIGH"]),
    active: z.boolean().default(true),
  })
  .strict();

export const investmentSchema = z
  .object({
    memberId: z.string().min(1).max(100),
    investmentProductId: z.string().min(1).max(100),
    principal: moneySchema,
    startDate: z.iso.date(),
    maturityDate: z.iso.date(),
  })
  .strict()
  .refine((row) => row.maturityDate > row.startDate, {
    message: "Maturity must be after the start date.",
    path: ["maturityDate"],
  });

export const investmentStatusSchema = z
  .object({ status: z.enum(["MATURED", "CANCELLED"]) })
  .strict();
export const dividendRunSchema = z
  .object({
    financialYear: z.number().int().min(2000).max(9998),
    periodStart: z.iso.date(),
    periodEnd: z.iso.date(),
    totalPoolAmount: moneySchema,
  })
  .strict()
  .superRefine((row, ctx) => {
    if (
      !z.iso.date().safeParse(row.periodStart).success ||
      !z.iso.date().safeParse(row.periodEnd).success
    )
      return;
    const days = dateNumber(row.periodEnd) - dateNumber(row.periodStart) + 1;
    const anniversary = new Date(`${row.periodStart}T00:00:00Z`);
    const startMonth = anniversary.getUTCMonth();
    anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
    // Match PostgreSQL's calendar-year interval: Feb 29 clamps to Feb 28.
    if (anniversary.getUTCMonth() !== startMonth) anniversary.setUTCDate(0);
    anniversary.setUTCDate(anniversary.getUTCDate() - 1);
    if (
      days < 365 ||
      days > 366 ||
      anniversary.toISOString().slice(0, 10) !== row.periodEnd
    )
      ctx.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "Select one complete financial year (12 months).",
      });
    if (Number(row.periodEnd.slice(0, 4)) !== row.financialYear)
      ctx.addIssue({
        code: "custom",
        path: ["financialYear"],
        message: "Financial year must match the period's ending year.",
      });
  });
export const dividendDecisionSchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    comment: z.string().trim().min(3).max(2000),
  })
  .strict();
export const dividendPostSchema = z
  .object({ password: z.string().min(1).max(200), confirm: z.literal(true) })
  .strict();
export const memberFilterSchema = z.object({
  memberId: z.string().min(1).max(100).optional(),
});
