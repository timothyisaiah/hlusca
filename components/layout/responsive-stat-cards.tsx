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
        "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:pb-0 lg:grid-cols-3",
        className,
      )}
    >
      {React.Children.map(children, (child) => (
        <div className="min-w-[15rem] snap-start md:min-w-0">{child}</div>
      ))}
    </div>
  );
}
