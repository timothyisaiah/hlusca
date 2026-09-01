import { cn } from "@/lib/utils";

type ActivityDonutProps = {
  title: string;
  description: string;
  centerValue: string;
  centerLabel: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  percent: number;
  className?: string;
};

export function ActivityDonut({
  title,
  description,
  centerValue,
  centerLabel,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
  percent,
  className,
}: ActivityDonutProps) {
  const clampedPercent = Math.max(0, Math.min(percent, 100));
  const angle = `${clampedPercent * 3.6}deg`;

  return (
    <div className={cn("grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center", className)}>
      <div
        className="mx-auto grid h-44 w-44 place-items-center rounded-full p-4 shadow-[0_24px_60px_rgba(99,102,241,0.18)]"
        style={{
          background: `conic-gradient(var(--accent) 0deg ${angle}, var(--accent-highlight) ${angle} 360deg)`,
        }}
      >
        <div className="grid h-full w-full place-items-center rounded-full bg-white/95 text-center shadow-inner">
          <div>
            <p className="text-3xl font-bold tracking-tight tabular-nums text-[var(--foreground)] md:text-4xl">
              {centerValue}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              {centerLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            {title}
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
            {description}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-[var(--accent)]" />
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                {primaryLabel}
              </p>
            </div>
            <p className="mt-3 text-lg font-semibold tabular-nums text-[var(--foreground)]">
              {primaryValue}
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-[var(--accent-highlight)]" />
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                {secondaryLabel}
              </p>
            </div>
            <p className="mt-3 text-lg font-semibold tabular-nums text-[var(--foreground)]">
              {secondaryValue}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
