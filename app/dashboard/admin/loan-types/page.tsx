import { LoanTypeManager } from "@/components/loans/loan-type-manager";
import { requireRole } from "@/lib/auth/server";
import {
  assertLoanRole,
  getLoanActor,
  listLoanTypes,
} from "@/lib/loans/service";
import { getSystemSetting } from "@/lib/system-settings";
import { SYSTEM_SETTING_KEYS } from "@/lib/constants";

export default async function LoanTypesPage() {
  const session = await requireRole(["ADMIN"]);
  const actor = await getLoanActor(session.id);
  assertLoanRole(actor, ["ADMIN"]);
  const [types, threshold] = await Promise.all([
    listLoanTypes(actor),
    getSystemSetting(SYSTEM_SETTING_KEYS.LOAN_BOARD_APPROVAL_THRESHOLD, ""),
  ]);
  return (
    <section className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">
          Loan configuration
        </h1>
        <p className="mt-2 text-base text-[var(--muted-foreground)]">
          Set product terms and the approval threshold for new applications.
        </p>
      </div>
      <LoanTypeManager types={types} threshold={threshold ?? ""} />
    </section>
  );
}
