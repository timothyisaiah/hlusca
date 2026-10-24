"use client";

import type * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import type { Session } from "next-auth";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import { SignOutButton } from "./sign-out-button";
import { BrandLockup, BrandMark } from "@/components/brand/brand-mark";
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
  headerAction,
}: {
  user: Session["user"];
  onNavigate?: () => void;
  collapsed?: boolean;
  headerAction?: React.ReactNode;
}) {
  const pathname = usePathname();
  const links = getNavForRole(user.role);

  return (
    // Header and footer keep their height; only the menu scrolls, so Sign out
    // stays reachable however many items a role has or how short the window is.
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("shrink-0 space-y-4", collapsed && "flex flex-col items-center")}>
        <div
          className={cn(
            "flex items-center justify-between gap-3",
            collapsed && "flex-col-reverse",
          )}
        >
          {collapsed ? (
            <BrandMark className="h-10 w-10 text-[var(--accent-ink)]" />
          ) : (
            <BrandLockup />
          )}
          {headerAction}
        </div>
        <div className={cn(collapsed && "sr-only")}>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            {ROLE_LABELS[user.role]}
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-[var(--foreground)]">
            {user.name ?? "Platform User"}
          </h2>
          <p className="truncate text-sm text-[var(--muted-foreground)]">
            {user.memberNumber ?? user.email ?? user.id}
          </p>
        </div>
      </div>

      <nav
        className={cn(
          "-mx-2 mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2",
          collapsed && "flex flex-col items-center",
        )}
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
              title={collapsed ? item.label : item.description}
              onClick={onNavigate}
              className={cn(
                "flex min-h-[44px] items-center gap-3 rounded-2xl border border-transparent px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--surface-border)] hover:bg-[var(--surface-muted)]",
                collapsed && "w-11 justify-center px-0",
                current && "border-[var(--surface-border)] bg-[var(--accent-soft)] text-[var(--accent-ink)]",
              )}
            >
              <span className="shrink-0 rounded-xl bg-[var(--accent-soft)] p-2 text-[var(--accent-ink)]">
                <Icon className="h-4 w-4" />
              </span>
              <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "mt-4 shrink-0 border-t border-[var(--surface-border)] pt-4",
          collapsed && "flex justify-center",
        )}
      >
        <SignOutButton compact={collapsed} />
      </div>
    </div>
  );
}

export function Sidebar({ user, collapsed, onToggleCollapsed }: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden h-screen flex-col border-r border-[var(--surface-border)] bg-[var(--surface-glass)] p-6 shadow-[12px_0_36px_var(--shadow-color)] transition-[padding] duration-200 md:sticky md:top-0 md:flex",
        collapsed && "items-center p-3",
      )}
    >
      <NavigationContent
        user={user}
        collapsed={collapsed}
        headerAction={
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-2xl text-[var(--accent-ink)] hover:bg-[var(--accent-soft)]"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        }
      />
    </aside>
  );
}

export function MobileSidebarSheet({ user, open, onClose }: MobileSidebarSheetProps) {
  return (
    <div className={cn("fixed inset-0 z-50 md:hidden", open ? "pointer-events-auto" : "pointer-events-none")}>
      <button
        type="button"
        className={cn("absolute inset-0 bg-[var(--overlay)] transition-opacity", open ? "opacity-100" : "opacity-0")}
        aria-label="Close navigation"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard navigation"
        className={cn("absolute inset-y-0 left-0 flex w-[min(var(--sidebar-width),calc(100vw-3rem))] flex-col bg-[var(--surface-solid)] p-6 shadow-[24px_0_64px_var(--shadow-color-strong)] transition-transform", open ? "translate-x-0" : "-translate-x-full")}
      >
        <NavigationContent
          user={user}
          onNavigate={onClose}
          headerAction={
            <button type="button" onClick={onClose} className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-2xl text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]" aria-label="Close navigation">
              <X className="h-5 w-5" />
            </button>
          }
        />
      </aside>
    </div>
  );
}
