"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import type { Session } from "next-auth";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { SignOutButton } from "./sign-out-button";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants";
import { getNavForRole } from "@/lib/dashboard/navigation";
import { cn } from "@/lib/utils";

type SidebarProps = {
  user: Session["user"];
  tabletExpanded: boolean;
  onToggleTablet: () => void;
};

type MobileNavigationProps = {
  user: Session["user"];
};

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

export function Sidebar({ user, tabletExpanded, onToggleTablet }: SidebarProps) {
  const pathname = usePathname();
  const links = getNavForRole(user.role);

  return (
    <aside className="hidden h-full flex-col rounded-[32px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,250,252,0.96))] p-3 shadow-[0_32px_80px_rgba(15,23,42,0.12)] md:flex lg:p-6">
      <div className="space-y-3 md:max-lg:flex md:max-lg:flex-col md:max-lg:items-center">
        <Badge variant="default">HLUSCA</Badge>
        <button
          type="button"
          onClick={onToggleTablet}
          className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl text-[var(--accent-ink)] hover:bg-[var(--accent-soft)] md:max-lg:flex"
          aria-label={tabletExpanded ? "Collapse navigation" : "Expand navigation"}
        >
          {tabletExpanded ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
        <div className="md:max-lg:hidden">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            {ROLE_LABELS[user.role]}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {user.name ?? "Platform User"}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {user.memberNumber ?? user.email ?? user.id}
          </p>
        </div>
      </div>

      <nav className="mt-8 flex-1 space-y-2 lg:mt-10" aria-label="Dashboard navigation">
        {links.map((item) => {
          const Icon = item.icon;
          const current = isCurrentPath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href as Route}
              aria-current={current ? "page" : undefined}
              title={item.label}
              className={cn(
                "group flex min-h-[44px] items-start gap-3 rounded-3xl border border-transparent px-3 py-3 transition hover:border-[var(--surface-border)] hover:bg-[var(--surface-muted)] lg:px-4 lg:py-4",
                current && "border-[var(--surface-border)] bg-[var(--accent-soft)]",
              )}
            >
              <span className="rounded-2xl bg-[var(--accent-soft)] p-2 text-[var(--accent-ink)]">
                <Icon className="h-4 w-4" />
              </span>
              <span
                className={cn(
                  "hidden space-y-1 lg:block",
                  tabletExpanded && "md:max-lg:block",
                )}
              >
                <span className="block text-sm font-semibold text-[var(--foreground)]">
                  {item.label}
                </span>
                <span className="hidden text-xs leading-5 text-[var(--muted-foreground)] lg:block">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3 md:max-lg:p-2 lg:mt-8 lg:p-4">
        <div className="md:max-lg:hidden">
          <p className="text-sm font-semibold text-[var(--foreground)]">Security mode</p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
            Every write action routes through the audit wrapper and server-side role checks.
          </p>
        </div>
        <div className="md:max-lg:hidden lg:mt-4 lg:block">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}

export function MobileNavigation({ user }: MobileNavigationProps) {
  const pathname = usePathname();
  const links = getNavForRole(user.role);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex min-h-[var(--mobile-nav-height)] items-center justify-around border-t border-[var(--surface-border)] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
      aria-label="Mobile dashboard navigation"
    >
      {links.map((item) => {
        const Icon = item.icon;
        const current = isCurrentPath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href as Route}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-semibold text-[var(--muted-foreground)]",
              current && "bg-[var(--accent-soft)] text-[var(--accent-ink)]",
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
