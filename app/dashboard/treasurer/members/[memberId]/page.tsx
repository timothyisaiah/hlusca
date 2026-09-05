import { notFound } from "next/navigation";

import { TreasurerMemberLedger } from "@/components/savings/treasurer-member-ledger";
import { requireRole } from "@/lib/auth/server";
import { ApiError } from "@/lib/api";
import { listMemberTransactions } from "@/lib/savings/service";

export default async function TreasurerMemberLedgerPage(
  props: PageProps<"/dashboard/treasurer/members/[memberId]">,
) {
  await requireRole(["TREASURER"]);
  const { memberId } = await props.params;

  let ledger;

  try {
    ledger = await listMemberTransactions(memberId, { takeAll: true });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  return <TreasurerMemberLedger ledger={ledger} />;
}
