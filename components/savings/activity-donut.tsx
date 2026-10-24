import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";

type ActivityDonutProps = {
  title?: string;
  description?: string;
  centerValue: string;
  centerLabel: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  percent: number;
  className?: string;
};

function LegendTile({
  label,
  value,
  dotClassName,
}: {
  label: string;
  value: string;
  dotClassName: string;
}) {
  return (
    <div className="min-w-0 rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-4">
      <div className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClassName)} />
        <p className="truncate text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
          {label}
        </p>
      </div>
      <Money value={value} size="md" className="mt-3 text-[var(--foreground)]" />
    </div>
  );
}

// Values are raw decimal strings; the legend formats them itself.
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
    // Sized by its own width: stacked in a narrow side card, donut beside the
    // legend once the card is wide enough (e.g. full-width on smaller screens).
    <div className={cn("@container", className)}>
      <div className="grid gap-6 @xl:grid-cols-[auto_minmax(0,1fr)] @xl:items-center">
        <div
          className="mx-auto grid h-40 w-40 place-items-center rounded-full p-4 shadow-[0_24px_60px_rgba(99,102,241,0.18)]"
          style={{
            background: `conic-gradient(var(--accent) 0deg ${angle}, var(--accent-highlight) ${angle} 360deg)`,
          }}
        >
          <div className="grid h-full w-full place-items-center rounded-full bg-white/95 text-center shadow-inner">
            <div>
              <p className="text-3xl font-bold tracking-tight tabular-nums text-[var(--foreground)]">
                {centerValue}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                {centerLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          {title || description ? (
            <div>
              {title ? (
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  {title}
                </p>
              ) : null}
              {description ? (
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {description}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 @xs:grid-cols-2">
            <LegendTile
              label={primaryLabel}
              value={primaryValue}
              dotClassName="bg-[var(--accent)]"
            />
            <LegendTile
              label={secondaryLabel}
              value={secondaryValue}
              dotClassName="bg-[var(--accent-highlight)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
