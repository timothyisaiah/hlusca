# Loan overdue job

`GET /api/cron/loans/overdue` flags unpaid installments whose date is earlier than
the current **Africa/Kampala** calendar date. Only PENDING/PARTIAL rows on ACTIVE
or DEFAULTED loans are changed. Paid, waived, closed, and due-today installments
are preserved. It does not change the amount owed or automatically default loans.

Apply the Phase 5 migration before deploying the job. Configure `CRON_SECRET`
with a random value of at least 32 characters. Calls require
`Authorization: Bearer <CRON_SECRET>`; a missing/short configuration returns 503,
and invalid authorization returns 401. Both failures are audited without storing
the secret or authorization header.

`vercel.json` schedules the route once per day at 00:00 UTC (03:00 Kampala).
Vercel cron runs against production deployments, and a redeploy registers changes.
The hosting plan determines scheduling precision. See [Vercel cron operations](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
On another host, configure its scheduler to send the same authenticated GET.

Successful calls return `{ "date": "YYYY-MM-DD", "updated": N }`. Repeating a
completed run changes no already-overdue rows. An UPDATE audit with entity type
LoanSchedule and metadata `job: loans-overdue` records before/after snapshots,
including successful zero-change runs. Failures roll back the schedule changes.

The job locks Loan rows before schedule rows, matching repayment lock order.
Loans being repaid or checked by another invocation are skipped and reconsidered
on the next run. Check deployment function logs and these audit records for failed
runs; retry the authenticated endpoint after resolving the failure. This pilot
uses one transaction per invocation and does not require a separate worker service.
