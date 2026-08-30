import type { UserRole } from "@prisma/client";

export const APP_NAME = "HLUSCA";
export const DEFAULT_CURRENCY = "UGX";
export const DATABASE_SCHEMA = "hlusca";
export const DEFAULT_ADMIN_USERNAME = "admin";
export const DEFAULT_ADMIN_EMAIL = "admin@hlusca.local";
export const DEFAULT_ADMIN_PASSWORD = "ChangeMe123!";

export const SYSTEM_SETTING_KEYS = {
  LOAN_BOARD_APPROVAL_THRESHOLD: "LOAN_BOARD_APPROVAL_THRESHOLD",
  MEMBER_NUMBER_SEQUENCE: "MEMBER_NUMBER_SEQUENCE",
} as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  BOARD: "Board",
  CLIENT: "Client",
  TREASURER: "Treasurer",
};

export const MEMBER_NUMBER_PATTERN = /^HLUSCA-\d{6}$/;
