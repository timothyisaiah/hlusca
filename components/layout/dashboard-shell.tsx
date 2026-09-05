"use client";

import { useState, useSyncExternalStore } from "react";
import type { Session } from "next-auth";
import { Menu, X } from "lucide-react";

import { MobileSidebarSheet, Sidebar } from "./sidebar";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "hlusca:sidebar-collapsed";
const SIDEBAR_PREFERENCE_EVENT = "hlusca:sidebar-preference";

function subscribeToSidebarPreference(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SIDEBAR_PREFERENCE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SIDEBAR_PREFERENCE_EVENT, onStoreChange);
  };
}

function getSidebarPreference() {
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

type DashboardShellProps = {
  user: Session["user"];
  children: React.ReactNode;
};

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const sidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarPreference,
    () => false,
  );

  function toggleSidebar() {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_KEY,
      String(!sidebarCollapsed),
    );
    window.dispatchEvent(new Event(SIDEBAR_PREFERENCE_EVENT));
  }

  return (
    <div
      className={cn(
        "grid min-h-screen w-full grid-cols-1 transition-[grid-template-columns] duration-200 md:grid-cols-[var(--sidebar-width)_1fr]",
        sidebarCollapsed && "md:grid-cols-[76px_1fr]",
      )}
    >
      <Sidebar
        user={user}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
      />
      <MobileSidebarSheet
        user={user}
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex min-h-16 w-full items-center justify-between border-b border-[var(--surface-border)] bg-white/85 px-4 backdrop-blur md:min-h-20 md:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen((open) => !open)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl text-[var(--accent-ink)] hover:bg-[var(--accent-soft)] md:hidden"
              aria-label={mobileSidebarOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileSidebarOpen}
            >
              {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                {ROLE_LABELS[user.role]}
              </p>
              <p className="text-sm font-semibold text-[var(--foreground)] md:text-base">
                HLUSCA dashboard
              </p>
            </div>
          </div>
          <Badge variant="muted" className="hidden sm:inline-flex">
            {user.name ?? "Platform User"}
          </Badge>
        </header>
        <main className="w-full flex-1 px-4 py-6 md:px-8 md:py-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
