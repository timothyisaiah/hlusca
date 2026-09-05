"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import type { Session } from "next-auth";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import { SignOutButton } from "./sign-out-button";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants";
import { getNavForRole } from "@/lib/dashboard/navigation";
import { cn } from "@/lib/utils";

type SidebarProps = {
  user: Session["user"];
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

type MobileSidebarSheetProps = {
  user: Session["user"];
  open: boolean;
  onClose: () => void;
};

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

function NavigationContent({
  user,
  onNavigate,
  collapsed = false,
}: {
  user: Session["user"];
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const links = getNavForRole(user.role);

  return (
    <>
      <div className={cn("space-y-3", collapsed && "flex flex-col items-center")}>
        {collapsed ? (
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-ink)]"
            aria-label="HLUSCA"
          >
            H
          </span>
        ) : (
          <Badge variant="default">HLUSCA</Badge>
        )}
        <div className={cn(collapsed && "sr-only")}>
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

      <nav
        className={cn("mt-8 flex-1 space-y-2", collapsed && "flex flex-col items-center")}
        aria-label="Dashboard navigation"
      >
        {links.map((item) => {
          const Icon = item.icon;
          const current = isCurrentPath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href as Route}
              aria-current={current ? "page" : undefined}
              title={item.label}
              onClick={onNavigate}
              className={cn(
                "group flex min-h-[44px] items-start gap-3 rounded-3xl border border-transparent px-3 py-3 transition hover:border-[var(--surface-border)] hover:bg-[var(--surface-muted)] lg:px-4 lg:py-4",
                collapsed && "w-11 justify-center px-0 py-2",
                current && "border-[var(--surface-border)] bg-[var(--accent-soft)]",
              )}
            >
              <span className="rounded-2xl bg-[var(--accent-soft)] p-2 text-[var(--accent-ink)]">
                <Icon className="h-4 w-4" />
              </span>
              <span className={cn("space-y-1", collapsed && "sr-only")}>
                <span className="block text-sm font-semibold text-[var(--foreground)]">
                  {item.label}
                </span>
                <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className={cn("mt-6 rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4", collapsed && "p-2")}>
        <div className={cn(collapsed && "sr-only")}>
          <p className="text-sm font-semibold text-[var(--foreground)]">Security mode</p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
            Every write action routes through the audit wrapper and server-side role checks.
          </p>
        </div>
        <div className={cn("mt-4", collapsed && "mt-0")}>
          <SignOutButton compact={collapsed} />
        </div>
      </div>
    </>
  );
}

export function Sidebar({ user, collapsed, onToggleCollapsed }: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden h-screen flex-col border-r border-[var(--surface-border)] bg-white/80 p-6 shadow-[12px_0_36px_rgba(15,23,42,0.04)] transition-[padding] duration-200 md:sticky md:top-0 md:flex",
        collapsed && "items-center p-3",
      )}
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="mb-4 flex min-h-[44px] min-w-[44px] items-center justify-center self-end rounded-2xl text-[var(--accent-ink)] hover:bg-[var(--accent-soft)]"
        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        title={collapsed ? "Expand navigation" : "Collapse navigation"}
      >
        {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>
      <NavigationContent user={user} collapsed={collapsed} />
    </aside>
  );
}

export function MobileSidebarSheet({ user, open, onClose }: MobileSidebarSheetProps) {
  return (
    <div className={cn("fixed inset-0 z-50 md:hidden", open ? "pointer-events-auto" : "pointer-events-none")}>
      <button
        type="button"
        className={cn("absolute inset-0 bg-slate-950/30 transition-opacity", open ? "opacity-100" : "opacity-0")}
        aria-label="Close navigation"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard navigation"
        className={cn("absolute inset-y-0 left-0 flex w-[min(var(--sidebar-width),calc(100vw-3rem))] flex-col bg-white p-6 shadow-[24px_0_64px_rgba(15,23,42,0.18)] transition-transform", open ? "translate-x-0" : "-translate-x-full")}
      >
        <button type="button" onClick={onClose} className="absolute right-4 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]" aria-label="Close navigation">
          <X className="h-5 w-5" />
        </button>
        <NavigationContent user={user} onNavigate={onClose} />
      </aside>
    </div>
  );
}
