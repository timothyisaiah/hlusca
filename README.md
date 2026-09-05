# HLUSCA

HLUSCA is a role-based cooperative management application for member enrollment,
savings accounts, and auditable financial operations.

## Loans: Phases 3 and 4

Apply the committed migrations and regenerate Prisma before using these screens:

```bash
npm run db:generate
npx prisma migrate deploy
```

- **Administrator → Loan Configuration:** create/edit/deactivate loan types and set
  the Board approval threshold. No loan products are seeded with assumed business
  terms; configure the products before members apply.
- **Member → Loans:** use the three-step application form and live eligibility
  preview, follow decisions, review the full agreement/PDF and schedule preview,
  and sign with a canvas signature, typed full name, agreement checkbox, and final
  confirmation. Rejection reasons and recent notifications appear here.
- **Treasurer/Board → Loans:** the default queue shows applications awaiting that
  role's review. Clear **Awaiting my review** to see approved applications and
  contracts. Treasurer reviews first; amounts equal to or above the configured
  threshold also require a different Board reviewer. Applications support search,
  status/date filters, pagination, and audited CSV/PDF exports.
- **Treasurer → application details:** after signing, confirm the Treasurer's
  password to disburse. The loan, savings credit, full monthly schedule, and audit
  event commit atomically. Duplicate disbursements are rejected.

Rates are **annual percentages**, with monthly interest equal to the annual rate
divided by 12. The processing fee is withheld once from the gross principal; the
net amount is credited to savings and the full principal remains repayable.
Outstanding balance includes all scheduled principal and interest. Monetary
calculations use decimals and round to two places; the final installment absorbs
rounding differences. Monthly due dates retain the original disbursement day,
clamped to the last day of shorter months.

Product terms and approval routing are frozen at application submission. Changes
to products or the threshold apply to new applications. Eligibility is checked
again against the current savings balance at disbursement; this release introduces
no collateral holds. Contract dates are a preview until disbursement.

Contract PDFs and bounded PNG signatures are stored privately in PostgreSQL for
the pilot, served through authenticated endpoints. The exact original PDF is
hashed and retained unchanged; signature evidence records its hash, signature
hash, typed name, consent version, timestamp, IP, and user agent. A database trigger
protects the agreement and signed evidence from edits/deletion. The PDF preserves
Latin-1 names; characters outside that set are written as explicit Unicode code
points, with the original full Unicode name retained in the on-screen agreement.

The disbursement endpoint is
`POST /api/loan-applications/:id/disburse`: its identifier is the application ID,
because the Loan is created by that action. Loan schedules are available at
`GET /api/loans/:id/schedule`. Repayment recording/reconciliation remains Phase 5.

### Loan lifecycle integration tests

The unit suite includes decimal amortization, calendar/rounding edge cases,
signature validation, and PDF/CSV checks. Database tests use a separate, disposable
local PostgreSQL database named **hlusca_loans_test**. They exercise real migrations
and route handlers, including both approval paths, changed thresholds, ownership
and role restrictions, immutable signatures, concurrent disbursements, and rollback
when audit persistence fails.

With that database running, set its URL and run (PowerShell example):

```powershell
$env:LOAN_TEST_DATABASE_URL='postgresql://postgres:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/hlusca_loans_test'
npm run test:loans:integration
```

The runner rejects remote hosts and other database names, applies migrations only
to the supplied test database, and retains synthetic records for inspection. The
ordinary unit suite skips integration tests when this variable is absent.

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` with the required application and Neon PostgreSQL variables:

```env
DATABASE_URL=
DATABASE_URL_UNPOOLED=
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=
```

Generate the Prisma client, then apply all committed migrations **before** starting
the application. This creates the `hlusca` schema and the savings ledger tables the
member dashboard depends on.

```bash
npm run db:generate
npx prisma migrate deploy
```

Seed core system settings and create the development administrator when needed:

```bash
npm run db:seed
npm run bootstrap:admin
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Commands

Run this in every environment after pulling new migrations, including production:

```bash
npx prisma migrate deploy
```

Use `npm run db:migrate` only while authoring a new migration locally. Do not use it
as the production deployment command.

## Verification

```bash
npm run typecheck
npm run lint
npm run test
```

## Deployment

Set the required environment variables in the deployment environment, then run the
same migration command before serving the new application build:

```bash
npx prisma migrate deploy
npm run build
npm run start
```

### GitHub Actions Migrations

On every successful push to `main`, GitHub Actions runs `npx prisma migrate deploy`
after validation. Add these repository secrets before merging the workflow:

```text
DATABASE_URL
DATABASE_URL_UNPOOLED
```

`DATABASE_URL_UNPOOLED` must contain the direct Neon connection string. Migration
jobs are serialized to prevent simultaneous deployments from changing the schema at
the same time.
