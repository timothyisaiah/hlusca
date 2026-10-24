import * as React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ResponsiveStatCardsProps = {
  children: React.ReactNode;
  className?: string;
};

export function ResponsiveStatCards({ children, className }: ResponsiveStatCardsProps) {
  return (
    <div
      className={cn(
        // Sized by the <main> container so opening the sidebar re-flows the
        // grid. Four columns only once each card keeps ~300px for figures.
        "grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @7xl/main:grid-cols-4 lg:gap-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
};

// Eyebrow label + dominant value (§12.6). Pair with <Money> for amounts so
// large figures scale to the card instead of overflowing it.
export function StatCard({ label, value, hint, className }: StatCardProps) {
  return (
    <Card className={cn("flex min-w-0 flex-col gap-4 p-6", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)] md:text-sm">
        {label}
      </p>
      <div className="min-w-0 text-[var(--foreground)]">{value}</div>
      {hint ? (
        <p className="mt-auto text-sm text-[var(--muted-foreground)]">{hint}</p>
      ) : null}
    </Card>
  );
}
