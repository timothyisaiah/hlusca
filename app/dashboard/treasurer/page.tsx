import { TreasurerSavingsWorkspace } from "@/components/savings/treasurer-savings-workspace";
import { requireRole } from "@/lib/auth/server";
import { getTreasurerSavingsWorkspace } from "@/lib/savings/service";

export default async function TreasurerDashboardPage() {
  await requireRole(["TREASURER"]);
  const workspace = await getTreasurerSavingsWorkspace();

  return <TreasurerSavingsWorkspace workspace={workspace} />;
}
