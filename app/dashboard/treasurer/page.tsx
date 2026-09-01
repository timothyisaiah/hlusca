import { TreasurerSavingsWorkspace } from "@/components/savings/treasurer-savings-workspace";
import { requireRole } from "@/lib/auth/server";
import { getTreasurerSavingsWorkspace } from "@/lib/savings/service";

export default async function TreasurerDashboardPage(
  props: PageProps<"/dashboard/treasurer">,
) {
  await requireRole(["TREASURER"]);
  const searchParams = await props.searchParams;
  const selectedMemberId =
    typeof searchParams.member === "string"
      ? searchParams.member
      : Array.isArray(searchParams.member)
        ? searchParams.member[0]
        : undefined;
  const workspace = await getTreasurerSavingsWorkspace(selectedMemberId);

  return <TreasurerSavingsWorkspace workspace={workspace} />;
}
