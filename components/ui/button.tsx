import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-[var(--surface)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] px-4 py-2 text-white shadow-sm hover:bg-[var(--accent-strong)] focus-visible:ring-[var(--accent)]",
        secondary:
          "bg-[var(--surface-muted)] px-4 py-2 text-[var(--foreground)] hover:bg-[var(--surface-border)] focus-visible:ring-[var(--accent)]",
        outline:
          "border border-[var(--surface-border)] bg-transparent px-4 py-2 text-[var(--foreground)] hover:bg-[var(--surface-muted)] focus-visible:ring-[var(--accent)]",
        ghost:
          "px-3 py-2 text-[var(--foreground)] hover:bg-[var(--surface-muted)] focus-visible:ring-[var(--accent)]",
        danger:
          "bg-[#8f2323] px-4 py-2 text-white hover:bg-[#741919] focus-visible:ring-[#8f2323]",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-5 text-base",
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
