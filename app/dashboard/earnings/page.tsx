import { EarningsWorkspace } from "@/components/earnings/earnings-workspace";
import { requireRole } from "@/lib/auth/server";
import { getEarningsSharePercent, listEarningsRuns } from "@/lib/earnings/service";
import { businessDate } from "@/lib/loans/reconciliation";
import { getLoanActor } from "@/lib/loans/service";

function previousMonth() {
  const [year, month] = businessDate().split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return date.toISOString().slice(0, 7);
}

export default async function EarningsPage() {
  const session = await requireRole(["TREASURER", "BOARD", "ADMIN"]);
  const actor = await getLoanActor(session.id);
  const [runs, sharePercent] = await Promise.all([
    listEarningsRuns(actor),
    getEarningsSharePercent(),
  ]);

  return (
    <section className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Member earnings</h1>
        <p className="mt-2 text-base text-[var(--muted-foreground)]">
          Share collected loan interest with savers each month, by their daily balances.
        </p>
      </div>
      <EarningsWorkspace
        runs={runs}
        role={actor.role}
        previousMonth={previousMonth()}
        sharePercent={sharePercent}
      />
    </section>
  );
}
