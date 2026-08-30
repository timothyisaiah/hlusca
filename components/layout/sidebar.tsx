import Link from "next/link";
import type { Route } from "next";
import type { Session } from "next-auth";

import { SignOutButton } from "./sign-out-button";
import { Badge } from "@/components/ui/badge";
import { getNavForRole } from "@/lib/dashboard/navigation";
import { ROLE_LABELS } from "@/lib/constants";

type SidebarProps = {
  user: Session["user"];
};

export function Sidebar({ user }: SidebarProps) {
  const links = getNavForRole(user.role);

  return (
    <aside className="flex h-full flex-col rounded-[32px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,250,252,0.96))] p-6 shadow-[0_32px_80px_rgba(15,23,42,0.12)]">
      <div className="space-y-3">
        <Badge variant="default">HLUSCA</Badge>
        <div>
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

      <nav className="mt-10 flex-1 space-y-2">
        {links.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className="group flex items-start gap-3 rounded-3xl border border-transparent px-4 py-4 transition hover:border-[var(--surface-border)] hover:bg-[var(--surface-muted)]"
            >
              <span className="mt-0.5 rounded-2xl bg-[var(--accent-soft)] p-2 text-[var(--accent-ink)]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="space-y-1">
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

      <div className="mt-8 rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Security mode
        </p>
        <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
          Every write action routes through the audit wrapper and server-side role checks.
        </p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
