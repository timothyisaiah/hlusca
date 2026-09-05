import { LoanWorkspace } from "@/components/loans/loan-workspace";
import { requireCurrentUser } from "@/lib/auth/server";
import { applicationFiltersSchema } from "@/lib/loans/schemas";
import { getLoanActor, listApplications } from "@/lib/loans/service";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireCurrentUser();
  const actor = await getLoanActor(session.id);
  const raw = await searchParams;
  const parsed = applicationFiltersSchema.safeParse({
    queue:
      actor.role === "TREASURER" || actor.role === "BOARD" ? "true" : "false",
    ...raw,
  });
  const filters = parsed.success
    ? parsed.data
    : applicationFiltersSchema.parse({});
  const data = await listApplications(actor, filters);
  const notifications =
    actor.role === "CLIENT"
      ? await prisma.notification.findMany({
          where: { userId: actor.id, type: "SYSTEM" },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : [];
  return (
    <section className="w-full space-y-6">
      <LoanWorkspace
        key={JSON.stringify(filters)}
        data={data}
        role={actor.role}
        initial={filters}
      />
      {notifications.length > 0 && (
        <aside className="space-y-3 rounded-3xl bg-white p-5">
          <h2 className="text-lg font-semibold md:text-xl">Recent updates</h2>
          {notifications.map((notice) => (
            <div
              key={notice.id}
              className="border-t border-[var(--surface-border)] pt-3"
            >
              <p className="text-base">{notice.message}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {formatDateTime(notice.createdAt)}
              </p>
            </div>
          ))}
        </aside>
      )}
    </section>
  );
}
