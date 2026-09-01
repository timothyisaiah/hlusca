import * as React from "react";

import { cn } from "@/lib/utils";

type ResponsiveStatCardsProps = {
  children: React.ReactNode;
  className?: string;
};

export function ResponsiveStatCards({ children, className }: ResponsiveStatCardsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
