import { MembersTable } from "@/components/tables/members-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/server";
import { listMembers } from "@/lib/members/service";

export default async function AdminMembersPage() {
  await requireRole(["ADMIN"]);
  const members = await listMembers();

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Membership
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl">
          Member registry
        </h1>
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
                  }
                : null,
            }))}
          />
        </CardContent>
      </Card>
    </section>
  );
}
