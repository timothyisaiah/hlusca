import { InvestmentWorkspace } from "@/components/investments/investment-workspace";
import { DividendHistory } from "@/components/investments/member-history";
import { requireCurrentUser } from "@/lib/auth/server";
import { getLoanActor } from "@/lib/loans/service";
import {
  dividendHistory,
  listInvestments,
  listProducts,
} from "@/lib/investments/service";
import { prisma } from "@/lib/db";

export default async function InvestmentsPage() {
  const session = await requireCurrentUser();
  const actor = await getLoanActor(session.id);
  const [products, investments, members, history] = await Promise.all([
    listProducts(actor),
    listInvestments(actor),
    actor.role === "ADMIN"
      ? prisma.member.findMany({
          where: { status: "ACTIVE" },
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
          },
          orderBy: { memberNumber: "asc" },
        })
      : [],
    actor.role === "CLIENT" ? dividendHistory(actor) : [],
  ]);
  return (
    <section className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Investments</h1>
        <p className="mt-2 text-base text-[var(--muted-foreground)]">
          {actor.role === "ADMIN"
            ? "Configure investment products and maintain member investment records."
            : "Explore products and view recorded investments and their terms."}
        </p>
      </div>
      <InvestmentWorkspace
        products={products}
        investments={investments}
        members={members}
        admin={actor.role === "ADMIN"}
      />
      {actor.role === "CLIENT" && <DividendHistory rows={history} />}
    </section>
  );
}
