import { ApplicationWizard } from "@/components/loans/application-wizard";
import { requireRole } from "@/lib/auth/server";
import {
  assertLoanRole,
  getLoanActor,
  listLoanTypes,
} from "@/lib/loans/service";

export default async function ApplyPage() {
  const session = await requireRole(["CLIENT"]);
  const actor = await getLoanActor(session.id);
  assertLoanRole(actor, ["CLIENT"]);
  return (
    <section className="w-full space-y-6">
      <h1 className="text-2xl font-semibold md:text-3xl">Loan application</h1>
      <ApplicationWizard types={await listLoanTypes(actor)} />
    </section>
  );
}
