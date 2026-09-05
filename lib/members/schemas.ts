import { z } from "zod";
import { UserRole } from "@prisma/client";

import {
  assertE164Phone,
  normalizeEmail,
  normalizeUsername,
} from "../auth/identifiers";

const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value && value.length > 0 ? value : undefined);

const emailField = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .transform((value) => normalizeEmail(value))
  .optional()
  .or(z.literal("").transform(() => undefined));

const usernameField = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be 32 characters or fewer.")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Username can only include letters, numbers, periods, underscores, and hyphens.",
  )
  .transform((value) => normalizeUsername(value));

function phoneField(fieldName: string) {
  return z
    .string()
    .trim()
    .transform((value) => assertE164Phone(value, fieldName));
}

const dateField = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid date.");
    }

    return parsed;
  });

export const memberEnrollmentSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required."),
  lastName: z.string().trim().min(2, "Last name is required."),
  username: usernameField,
  phone: phoneField("Phone number"),
  email: emailField,
  address: z.string().trim().min(2, "Address is required."),
  nationalIdNumber: z.string().trim().min(5, "National ID is required."),
  nextOfKinName: z.string().trim().min(2, "Next of kin name is required."),
  nextOfKinPhone: phoneField("Next-of-kin phone number"),
  dateOfBirth: dateField,
  photoUrl: optionalTrimmedString,
});

export const adminMemberUpdateSchema = z.object({
  firstName: z.string().trim().min(2).optional(),
  lastName: z.string().trim().min(2).optional(),
  username: usernameField.optional(),
  phone: phoneField("Phone number").optional(),
  email: emailField,
  address: z.string().trim().min(2).optional(),
  nationalIdNumber: z.string().trim().min(5).optional(),
  nextOfKinName: z.string().trim().min(2).optional(),
  nextOfKinPhone: phoneField("Next-of-kin phone number").optional(),
  dateOfBirth: dateField.optional(),
  photoUrl: optionalTrimmedString,
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "EXITED"]).optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export const selfMemberUpdateSchema = z.object({
  address: z.string().trim().min(2).optional(),
  phone: phoneField("Phone number").optional(),
  email: emailField,
  nextOfKinName: z.string().trim().min(2).optional(),
  nextOfKinPhone: phoneField("Next-of-kin phone number").optional(),
});

export const passwordResetRequestSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your username, phone, email, or member number."),
});

export const passwordResetConfirmSchema = z.object({
  identifier: z.string().trim().min(1),
  token: z.string().trim().min(6, "Enter the reset code or token you received."),
  newPassword: z.string().min(10),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(10, "New password must be at least 10 characters."),
});

export type MemberEnrollmentInput = z.infer<typeof memberEnrollmentSchema>;
export type AdminMemberUpdateInput = z.infer<typeof adminMemberUpdateSchema>;
export type SelfMemberUpdateInput = z.infer<typeof selfMemberUpdateSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
