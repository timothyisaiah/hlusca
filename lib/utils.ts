import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { DEFAULT_CURRENCY } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number | string,
  currency = DEFAULT_CURRENCY,
) {
  const amount =
    typeof value === "number" ? value : Number.parseFloat(value ?? "0");

  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

// Splits a formatted amount so the currency code can be styled apart from the
// figure, e.g. { code: "UGX", amount: "-13,000.00" }.
export function formatCurrencyParts(
  value: number | string,
  currency = DEFAULT_CURRENCY,
) {
  const amount =
    typeof value === "number" ? value : Number.parseFloat(value ?? "0");
  const parts = new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).formatToParts(Number.isFinite(amount) ? amount : 0);

  return {
    code: parts.find((part) => part.type === "currency")?.value ?? currency,
    amount: parts
      .filter((part) => part.type !== "currency" && part.type !== "literal")
      .map((part) => part.value)
      .join(""),
  };
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Not provided";
  }

  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("en-UG", {
    dateStyle: "medium",
    // Calendar-only dates retain their day; timestamps use the SACCO's timezone.
    // Explicit zones also keep server and browser rendering identical.
    timeZone:
      typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? "UTC"
        : "Africa/Kampala",
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "Not provided";
  }

  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("en-UG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

/** "2026-03" → "March 2026". */
export function formatMonth(month: string) {
  return new Intl.DateTimeFormat("en-UG", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
