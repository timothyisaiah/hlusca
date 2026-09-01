import { TransactionType } from "@prisma/client";
import { z } from "zod";

function optionalTextField(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));
}

function parseDateBoundary(value: string | undefined, boundary: "start" | "end") {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date.");
  }

  if (boundary === "start") {
    parsed.setHours(0, 0, 0, 0);
  } else {
    parsed.setHours(23, 59, 59, 999);
  }

  return parsed;
}

export const savingsMutationSchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .transform((value) => String(value).trim())
    .refine(
      (value) => /^\d+(?:\.\d{1,2})?$/.test(value) && Number.parseFloat(value) > 0,
      "Enter a valid amount greater than zero with up to 2 decimal places.",
    ),
  reference: optionalTextField(80),
  narrative: optionalTextField(240),
});

export const savingsLedgerQuerySchema = z
  .object({
    query: optionalTextField(80),
    type: z.nativeEnum(TransactionType).optional(),
    from: z
      .string()
      .trim()
      .optional()
      .transform((value) => parseDateBoundary(value, "start")),
    to: z
      .string()
      .trim()
      .optional()
      .transform((value) => parseDateBoundary(value, "end")),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(8),
    format: z.enum(["json", "csv", "pdf"]).default("json"),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "The start date must be before the end date.",
    path: ["to"],
  });

export type SavingsMutationInput = z.infer<typeof savingsMutationSchema>;
export type SavingsLedgerQueryInput = z.infer<typeof savingsLedgerQuerySchema>;
