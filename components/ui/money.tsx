import { cn, formatCurrency, formatCurrencyParts } from "@/lib/utils";

// Each size scales with the width of its own wrapper (cqi) between a readable
// floor and the design-scale ceiling, so large figures shrink instead of
// spilling out of narrow cards. The currency code wraps onto its own line as a
// last resort.
const sizes = {
  md: {
    amount: "text-[length:clamp(1.125rem,9cqi,1.5rem)] font-semibold",
    code: "text-xs",
  },
  lg: {
    amount: "text-[length:clamp(1.75rem,11cqi,2.5rem)] font-bold",
    code: "text-sm",
  },
  xl: {
    amount: "text-[length:clamp(2rem,8cqi,3.25rem)] font-bold",
    code: "text-base",
  },
} as const;

type MoneyProps = {
  value: number | string;
  size?: keyof typeof sizes;
  className?: string;
  codeClassName?: string;
};

export function Money({ value, size = "lg", className, codeClassName }: MoneyProps) {
  const { code, amount } = formatCurrencyParts(value);

  return (
    <div className={cn("@container min-w-0", className)}>
      <p
        className="flex flex-wrap items-baseline gap-x-2 gap-y-1"
        aria-label={formatCurrency(value)}
      >
        <span
          aria-hidden
          className={cn(
            "font-semibold tracking-[0.12em] opacity-70",
            sizes[size].code,
            codeClassName,
          )}
        >
          {code}
        </span>
        <span
          aria-hidden
          className={cn(
            "min-w-0 leading-none tracking-tight tabular-nums [overflow-wrap:anywhere]",
            sizes[size].amount,
          )}
        >
          {amount}
        </span>
      </p>
    </div>
  );
}
