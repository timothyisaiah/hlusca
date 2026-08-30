import { EnrollMemberForm } from "@/components/forms/enroll-member-form";
import { requireRole } from "@/lib/auth/server";

export default async function EnrollMemberPage() {
  await requireRole(["ADMIN"]);

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Enrollment
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
          Create a member record
        </h1>
      </div>
      <EnrollMemberForm />
    </section>
  );
}
