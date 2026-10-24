import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The single source of action styling. Links that act as buttons use
// buttonVariants() so a link and a <Button> with the same variant look identical.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent-solid)] px-5 text-[var(--accent-contrast)] shadow-sm hover:bg-[var(--accent-solid-hover)] focus-visible:ring-[var(--accent)]",
        secondary:
          "bg-[var(--surface-muted)] px-5 text-[var(--foreground)] hover:bg-[var(--surface-border)] focus-visible:ring-[var(--accent)]",
        outline:
          "border border-[var(--surface-border-strong)] bg-transparent px-5 text-[var(--foreground)] hover:bg-[var(--surface-muted)] focus-visible:ring-[var(--accent)]",
        ghost:
          "px-3 text-[var(--foreground)] hover:bg-[var(--surface-muted)] focus-visible:ring-[var(--accent)]",
        danger:
          "bg-[var(--danger-solid)] px-5 text-white hover:bg-[var(--danger-solid-hover)] focus-visible:ring-[var(--danger-solid)]",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);

Button.displayName = "Button";

export { Button, buttonVariants };
