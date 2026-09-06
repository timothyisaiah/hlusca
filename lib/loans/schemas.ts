import { z } from "zod";

// Money is transported as decimal strings; never accept floating-point writes.
export const moneySchema = z
  .string()
  .trim()
  .regex(
    /^\d{1,12}(\.\d{1,2})?$/,
    "Enter an amount with at most two decimal places.",
  )
  .refine((value) => Number(value) > 0, "Amount must be greater than zero.");
const percentage = z
  .string()
  .trim()
  .regex(/^\d{1,3}(\.\d{1,4})?$/)
  .refine((value) => Number(value) <= 100, "Percentage cannot exceed 100.");

export const loanTypeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  interestMethod: z.enum(["FLAT", "REDUCING_BALANCE"]),
  interestRate: percentage,
  maxTermMonths: z.number().int().min(1).max(360),
  maxMultipleOfSavings: z
    .string()
    .trim()
    .regex(/^\d{1,3}(\.\d{1,2})?$/)
    .refine((value) => Number(value) > 0, "Savings multiple must be positive."),
  processingFeePercent: percentage.refine(
    (value) => Number(value) < 100,
    "Fee must be less than 100%.",
  ),
  active: z.boolean().default(true),
});
export const applicationSchema = z.object({
  loanTypeId: z.string().min(1).max(100),
  amountRequested: moneySchema,
  termMonths: z.number().int().min(1).max(360),
  purpose: z
    .string()
    .trim()
    .min(10, "Describe the purpose in at least 10 characters.")
    .max(2000),
});
export const previewSchema = applicationSchema.omit({ purpose: true });
export const decisionSchema = z.object({
  comment: z.string().trim().max(2000).default(""),
});
export const rejectionSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(3, "Provide a reason for rejection.")
    .max(2000),
});
export const thresholdSchema = z.object({ threshold: moneySchema });
export const signatureSchema = z.object({
  typedName: z.string().trim().min(3).max(200),
  signature: z.string().max(350000).startsWith("data:image/png;base64,"),
  documentHash: z.string().regex(/^[a-f0-9]{64}$/),
  agree: z.literal(true),
});
export const disbursementSchema = z.object({
  password: z.string().min(1).max(200),
  confirm: z.literal(true),
});
export const paymentSchema = z.object({
  amount: moneySchema,
  paymentDate: z.iso.date(),
  method: z.enum(["CASH", "BANK_TRANSFER", "MOBILE_MONEY"]),
  reference: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9 ./_-]*$/,
      "Use letters, numbers, spaces, dots, /, _ or - in the receipt reference.",
    )
    .transform((value) => value.toUpperCase()),
  targetInstallmentNumber: z.number().int().min(1).max(360).optional(),
  confirm: z.literal(true),
});
export const applicationFiltersSchema = z
  .object({
    status: z
      .enum(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"])
      .optional(),
    query: z.string().trim().max(100).default(""),
    memberId: z.string().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    queue: z.enum(["true", "false"]).default("false"),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine(
    (input) => !input.from || !input.to || input.from <= input.to,
    "The start date must not be after the end date.",
  );
