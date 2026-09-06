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

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
