import { notFound } from "next/navigation";

import { MemberProfileForm } from "@/components/forms/member-profile-form";
import { requireRole } from "@/lib/auth/server";
import { getClientDashboardSummary } from "@/lib/members/service";

export default async function ClientProfilePage() {
  const user = await requireRole(["CLIENT"]);

  if (!user.memberId) {
    notFound();
  }

  const member = await getClientDashboardSummary(user.memberId);

  if (!member) {
    notFound();
  }

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Profile
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl">
          Manage your contact details
        </h1>
      </div>
      <MemberProfileForm
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
    </section>
  );
}
