import Link from "next/link";
import { UserPlus } from "lucide-react";

import { MembersTable } from "@/components/tables/members-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/server";
import { listMembers } from "@/lib/members/service";

export default async function AdminMembersPage() {
  await requireRole(["ADMIN"]);
  const members = await listMembers();

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Membership
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl">
            Member registry
          </h1>
        </div>
        <Link
          href="/dashboard/admin/members/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          <UserPlus className="h-4 w-4" />
          Enroll member
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All members</CardTitle>
        </CardHeader>
        <CardContent>
          <MembersTable
            members={members.map((member) => ({
              id: member.id,
              memberNumber: member.memberNumber,
              firstName: member.firstName,
              lastName: member.lastName,
              status: member.status,
              phone: member.phone,
              createdAt: member.createdAt.toISOString(),
              user: member.user
                ? {
                    username: member.user.username,
                    role: member.user.role,
                  }
                : null,
            }))}
          />
        </CardContent>
      </Card>
    </section>
  );
}
