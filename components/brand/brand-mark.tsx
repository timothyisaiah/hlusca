import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

const MASK = "url(/brand/hlusca-mark.png) center / contain no-repeat";
const maskStyle: CSSProperties = { mask: MASK, WebkitMask: MASK };

/**
 * The HLUSCA logo mark. The PNG is used as a mask filled with currentColor, so
 * one asset follows the theme: set the colour with a text-* class.
 */
export function BrandMark({
  className,
  label = "HLUSCA",
  decorative = false,
}: {
  className?: string;
  label?: string;
  decorative?: boolean;
}) {
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={cn("inline-block shrink-0 bg-current", className)}
      style={maskStyle}
    />
  );
}

/** Mark + wordmark lockup for headers and navigation. */
export function BrandLockup({
  className,
  subtitle,
}: {
  className?: string;
  subtitle?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-3", className)}>
      <BrandMark decorative className="h-10 w-10 text-[var(--accent-ink)]" />
      <span className="min-w-0">
        <span className="block text-lg font-bold leading-tight tracking-[0.14em] text-[var(--foreground)]">
          HLUSCA
        </span>
        {subtitle ? (
          <span className="block truncate text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
