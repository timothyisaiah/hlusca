import { z } from "zod";

export const earningsRunSchema = z
  .object({
    month: z
      .string()
      .trim()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose a month (YYYY-MM)."),
  })
  .strict();

export const earningsPostSchema = z
  .object({ password: z.string().min(1).max(200), confirm: z.literal(true) })
  .strict();

export const earningsCancelSchema = z.object({}).strict();

export const earningsSettingsSchema = z
  .object({
    memberSharePercent: z
      .string()
      .trim()
      .regex(/^\d{1,3}(\.\d{1,2})?$/, "Enter a percentage with up to 2 decimals.")
      .refine((value) => Number(value) <= 100, "The share cannot exceed 100%."),
  })
  .strict();

export const memberFilterSchema = z.object({
  memberId: z.string().min(1).max(100).optional(),
});
