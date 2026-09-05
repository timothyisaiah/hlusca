import { notFound } from "next/navigation";
import { ApplicationDetail } from "@/components/loans/application-detail";
import { requireCurrentUser } from "@/lib/auth/server";
import { ApiError } from "@/lib/api";
import {
  getApplication,
  getLoanActor,
  getLoanSchedule,
} from "@/lib/loans/service";
import type { ApplicationRecord } from "@/lib/loans/types";

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCurrentUser();
  const actor = await getLoanActor(session.id);
  const { id } = await params;
  const application = await getApplication(id, actor).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const schedule = application.loan
    ? await getLoanSchedule(application.loan.id, actor)
    : [];
  return (
    <section className="w-full">
      <ApplicationDetail
        application={
          JSON.parse(JSON.stringify(application)) as ApplicationRecord
        }
        role={actor.role}
        schedule={JSON.parse(JSON.stringify(schedule))}
      />
    </section>
  );
}
