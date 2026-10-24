import { TreasurerSavingsWorkspace } from "@/components/savings/treasurer-savings-workspace";
import { TreasurerWithdrawalQueue } from "@/components/savings/withdrawal-requests";
import { requireRole } from "@/lib/auth/server";
import { getTreasurerSavingsWorkspace } from "@/lib/savings/service";
import { getTreasurerWithdrawalQueue } from "@/lib/savings/withdrawals";

export default async function TreasurerDashboardPage() {
  await requireRole(["TREASURER"]);
  const [workspace, withdrawals] = await Promise.all([
    getTreasurerSavingsWorkspace(),
    getTreasurerWithdrawalQueue(),
  ]);

  return (
    <TreasurerSavingsWorkspace
      workspace={workspace}
      withdrawalQueue={<TreasurerWithdrawalQueue queue={withdrawals} />}
    />
  );
}
