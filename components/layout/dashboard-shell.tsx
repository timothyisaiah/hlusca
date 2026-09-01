"use client";

import { useSyncExternalStore } from "react";
import type { Session } from "next-auth";

import { MobileNavigation, Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

const TABLET_NAV_PREFERENCE_KEY = "hlusca:tablet-nav-expanded";
const TABLET_NAV_PREFERENCE_EVENT = "hlusca:tablet-nav-preference";

type DashboardShellProps = {
  user: Session["user"];
  children: React.ReactNode;
};

export function DashboardShell({ user, children }: DashboardShellProps) {
  const tabletNavExpanded = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener(TABLET_NAV_PREFERENCE_EVENT, onStoreChange);
      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(TABLET_NAV_PREFERENCE_EVENT, onStoreChange);
      };
    },
    () => window.localStorage.getItem(TABLET_NAV_PREFERENCE_KEY) === "true",
    () => false,
  );

  function toggleTabletNavigation() {
    window.localStorage.setItem(
      TABLET_NAV_PREFERENCE_KEY,
      String(!tabletNavExpanded),
    );
    window.dispatchEvent(new Event(TABLET_NAV_PREFERENCE_EVENT));
  }

  return (
    <div className="min-h-screen pb-[var(--mobile-nav-height)] md:px-4 md:py-4 md:pb-4 lg:px-6">
      <div
        className={cn(
          "mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl gap-4 lg:grid-cols-[320px_minmax(0,1fr)]",
          tabletNavExpanded
            ? "md:max-lg:grid-cols-[272px_minmax(0,1fr)]"
            : "md:max-lg:grid-cols-[72px_minmax(0,1fr)]",
        )}
      >
        <Sidebar
          user={user}
          tabletExpanded={tabletNavExpanded}
          onToggleTablet={toggleTabletNavigation}
        />
        <main className="min-w-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(249,251,251,0.92))] px-5 py-7 md:rounded-[32px] md:border md:border-white/60 md:p-8 md:shadow-[0_32px_80px_rgba(15,23,42,0.08)]">
          {children}
        </main>
      </div>
      <MobileNavigation user={user} />
    </div>
  );
}
