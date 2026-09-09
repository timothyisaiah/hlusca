import { DividendWorkspace } from "@/components/investments/dividend-workspace";
import { requireRole } from "@/lib/auth/server";
import { getLoanActor } from "@/lib/loans/service";
import { businessDate } from "@/lib/loans/reconciliation";
import { listRuns } from "@/lib/investments/service";

export default async function DividendsPage() {
  const session = await requireRole(["TREASURER", "BOARD", "ADMIN"]);
  const actor = await getLoanActor(session.id);
  const runs = await listRuns(actor);
  return (
    <section className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Dividends</h1>
        <p className="mt-2 text-base text-[var(--muted-foreground)]">
          Propose, review, and post financial-year dividends to member savings.
        </p>
      </div>
      <DividendWorkspace
        runs={runs}
        role={actor.role}
        previousYear={Number(businessDate().slice(0, 4)) - 1}
      />
    </section>
  );
}
