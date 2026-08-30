import { compare, hash } from "bcryptjs";
import { createHash, randomBytes, randomInt } from "node:crypto";

import { ApiError } from "../api";

const passwordComplexity = {
  minLength: 10,
  lower: /[a-z]/,
  upper: /[A-Z]/,
  digit: /\d/,
  symbol: /[^A-Za-z0-9]/,
};

export async function hashPassword(password: string) {
  assertStrongPassword(password);
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export function assertStrongPassword(password: string) {
  const failures: string[] = [];

  if (password.length < passwordComplexity.minLength) {
    failures.push(`at least ${passwordComplexity.minLength} characters`);
  }

  if (!passwordComplexity.lower.test(password)) {
    failures.push("one lowercase letter");
  }

  if (!passwordComplexity.upper.test(password)) {
    failures.push("one uppercase letter");
  }

  if (!passwordComplexity.digit.test(password)) {
    failures.push("one number");
  }

  if (!passwordComplexity.symbol.test(password)) {
    failures.push("one symbol");
  }

  if (failures.length > 0) {
    throw new ApiError(
      `Password must include ${failures.join(", ")}.`,
      400,
      "WEAK_PASSWORD",
    );
  }
}

export function generateTemporaryPassword() {
  return `Hl!${randomBytes(6).toString("base64url")}9a`;
}

export function generateResetToken() {
  return randomBytes(24).toString("base64url");
}

export function generateOtpCode() {
  return String(randomInt(100000, 1_000_000));
}

export function hashOpaqueToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
