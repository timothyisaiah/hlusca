import { notFound } from "next/navigation";

import { MemberProfileForm } from "@/components/forms/member-profile-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { getMemberById } from "@/lib/members/service";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { id } = await params;

  const member = await getMemberById(id).catch(() => null);

  if (!member) {
    notFound();
  }

  const auditFilters = [
    {
      entityType: "Member",
      entityId: member.id,
    },
  ];

  if (member.user) {
    auditFilters.push({
      entityType: "User",
      entityId: member.user.id,
    });
  }

  const auditEntries = await prisma.auditLog.findMany({
    where: {
      OR: auditFilters,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 6,
  });

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Member profile
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {member.firstName} {member.lastName}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>{member.memberNumber}</Badge>
            <Badge variant={member.status === "ACTIVE" ? "success" : "warning"}>
              {member.status}
            </Badge>
          </div>
        </div>
        <Card className="min-w-[260px]">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
              Savings account
            </p>
            <p className="mt-3 text-lg font-semibold">
              {member.savingsAccount?.accountNumber ?? "Not created"}
            </p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Balance {formatCurrency(member.savingsAccount?.balance?.toString() ?? "0")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <MemberProfileForm
          adminMode
          member={{
            id: member.id,
            memberNumber: member.memberNumber,
            firstName: member.firstName,
            lastName: member.lastName,
            dateOfBirth: member.dateOfBirth
              ? member.dateOfBirth.toISOString().slice(0, 10)
              : "",
            nationalIdNumber: member.nationalIdNumber,
            address: member.address,
            phone: member.phone,
            email: member.email ?? "",
            nextOfKinName: member.nextOfKinName,
            nextOfKinPhone: member.nextOfKinPhone,
            photoUrl: member.photoUrl ?? "",
            status: member.status,
            username: member.user?.username ?? "",
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>Recent audit events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {auditEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-[var(--foreground)]">
                    {entry.action}
                  </p>
                  <Badge variant={entry.status === "SUCCESS" ? "success" : "warning"}>
                    {entry.status}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {formatDate(entry.createdAt)}
                </p>
                {entry.failureReason ? (
                  <p className="mt-2 text-sm text-[#8a1f1f]">{entry.failureReason}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
