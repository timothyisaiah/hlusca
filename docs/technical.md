# Architecture and operations

## Application structure

HLUSCA is a Next.js App Router application using React and TypeScript, PostgreSQL through Prisma, NextAuth Credentials/JWT sessions, Zod validation and Tailwind-based components. See package.json for the exact installed version constraints. The application database schema is named `hlusca`.

```flow
Page and React component: present records, forms and navigation
Route handler: authenticate request, validate input and format response
Domain service: enforce ownership, workflow and financial rules
Prisma transaction and PostgreSQL constraints: persist records and audit
```

| Location | Responsibility |
| --- | --- |
| app/(auth), app/dashboard | Sign-in and role-oriented pages, server-side access checks |
| app/api | Explicit HTTP route handlers |
| components/forms, savings, loans, investments | User workflows and confirmations |
| lib/auth, proxy.ts | Identifier resolution, password/session handling and route protection |
| lib/members, savings, loans, investments | Business rules and persistence |
| lib/audit | Audited mutation transaction wrapper and request metadata |
| lib/pdf | Agreement and ledger PDF generation |
| lib/notifications | Stored notification creation; no external delivery transport |
| prisma/schema.prisma, prisma/migrations | Data model and ordered migrations, including database-only guards |
| jobs/README.md, vercel.json | Overdue-job operations and deployment schedule |
| docs, scripts/docs.mjs | This handbook, catalog and drift checks |

Next.js in this repository ships local documentation under `node_modules/next/dist/docs/`. Read the relevant local guide before changing framework code, as required by AGENTS.md.

## Theming and UI tokens

All colours come from CSS custom properties in [globals.css](../app/globals.css): a light set on `:root` and a dark set on `.dark` (surfaces, text, accent, status, ledger categories, hero gradients, shadows). Components reference tokens such as `bg-[var(--surface-solid)]` or `text-[var(--danger)]`, never literal colours. Exceptions: white text and overlays on the accent-blue Treasurer hero, and the white signature pad. A pre-paint script in [layout](../app/layout.tsx) applies the stored choice or the device preference before first render, avoiding a light flash; [theme](../lib/theme.ts) and the theme toggle manage the choice (`localStorage` key `hlusca:theme`). `color-scheme` follows the theme so native date pickers and selects match. Filled buttons use `--accent-solid`, which meets WCAG AA contrast for white labels in both themes.

Base element styles sit in `@layer base`, because unlayered CSS overrides Tailwind utilities. That is what previously turned button-styled links' white text dark. Use `buttonVariants()` for any link that should look like a button.

The handbook (`docs/index.html`) is a separate document with its own light and dark tokens in [handbook.css](handbook.css). A pre-paint script in the build template and [handbook.js](handbook.js) read the same `hlusca:theme` preference as the app, and its toolbar has its own theme button. Printing always uses the light palette. It is served raw rather than inside an app page so the two stylesheets never mix.

## Brand assets

The logo mark lives in `public/brand/`: `hlusca-mark.png` (white on transparent, used as a CSS mask by the `BrandMark` component so it takes the current theme colour) and `hlusca-logo-original.png` (the supplied artwork). Browser and platform icons use Next.js file conventions in `app/`: `favicon.ico`, `icon.png`, `apple-icon.png`, the `opengraph-image.png`/`twitter-image.png` share thumbnail with alt text, and `manifest.ts` (192/512 and maskable icons in `public/brand/`). These were generated once from the original with an image script; regenerate them all together if the logo changes. `metadataBase` comes from `NEXTAUTH_URL`, so share thumbnails resolve to absolute URLs.

## Data relationships

```flow
Member links to a login User and one SavingsAccount
SavingsAccount has Transaction entries and a current balance
LoanApplication has ordered LoanApprovalStep records and a LoanContract
Disbursement creates Loan, LoanSchedule and a linked savings credit
LoanPayment receipts are allocated to installments through LoanPaymentAllocation
DividendRun proposals freeze shares; posting creates DividendAllocation and savings credits
```

MemberInvestment links a member and investment product while retaining the original terms. AuditLog records actor, action, entity, success/failure and snapshots. Notification and PasswordResetRequest support access and workflow messages. SystemSetting stores operational settings such as the approval threshold. See the generated [data dictionary](generated/data.md) for every model, field and enum.

## Financial integrity and audit scope

`runAuditedMutation` writes successful business changes and the success audit in one transaction; failures roll back and attempt a separate failure audit. Failure logging can itself be unavailable if the database is down. Earlier proxy/route guard denials do not all pass through the same audited wrapper; the handbook does not claim every failed request is audited.

Savings writes lock the account. Repayments and overdue updates acquire Loan locks before schedule changes. Disbursements lock application/account records; dividend proposals serialize period creation and postings lock runs and recipient accounts. Withdrawal-request payouts lock the request then the account; member-earnings proposals serialize on an advisory lock and postings lock the run and recipient accounts. Existing lifecycle integration tests exercise concurrency and rollback behavior.

Every pooled database connection runs its queries one at a time ([db-serialize](../lib/db-serialize.ts), attached in [db](../lib/db.ts)). Inside an interactive transaction all queries share one connection, and Prisma's nested `include` loading or `Promise.all` on `tx` would otherwise overlap `client.query()` calls, which pg deprecates (removed in pg@9). Behaviour is unchanged: pg already executed them in order. Restart the dev server after changing this file, because the pool is cached on `globalThis` in development.

Database migrations protect retained contract/signature evidence and immutable loan receipts. Payment allocation rows can be recomputed after backdating while receipt records remain unchanged. The build specification's broader audit-role privilege review is still a pilot-readiness item; there is no implemented audit viewer. Operators must use authorized database/log tooling to inspect audits.

Contracts and signatures are stored privately in PostgreSQL for the pilot and served through authenticated routes. The original agreement PDF is hashed and retained unchanged. PDF text supports Latin-1; names outside that range are represented with explicit Unicode code points in the PDF while the on-screen agreement retains the original name.

## Local setup

Install dependencies using the committed lockfile:

```bash
npm ci
```

Configure the application environment, generate the Prisma client, apply migrations and start the app:

```bash
npm run db:generate
npx prisma migrate deploy
npm run db:seed
npm run bootstrap:admin
npm run dev
```

Seed/bootstrap are setup operations, not commands to repeat casually against an existing deployment. The bootstrap script's environment inputs and behavior are described in its source. No real credentials are stored in this handbook.

| Variable | Purpose |
| --- | --- |
| DATABASE_URL | Application PostgreSQL connection |
| DATABASE_URL_UNPOOLED | Direct connection for migrations/administration |
| NEXTAUTH_URL | Application origin, e.g. http://localhost:3000 |
| AUTH_SECRET | Session secret, at least 32 characters |
| CRON_SECRET | Independent overdue-job bearer secret, at least 32 characters |
| LOAN_TEST_DATABASE_URL | Disposable local hlusca_loans_test database for loan integration tests |
| INVESTMENT_TEST_DATABASE_URL | Disposable local hlusca_investments_test database for investment integration tests |

The application explicitly reads the first four variables via lib/env.ts. Prisma CLI environment loading is configured in prisma.config.ts; configure the environment available to that process as well. Documentation generation does not load these variables, import application services or connect to a database.

## Migrations and deployment

Apply all committed migrations before serving an updated application. The current investment/dividend code requires the Phase 6 migration as well as the preceding membership, savings, loan and repayment migrations.

```bash
npm run db:generate
npx prisma migrate deploy
npm run build
npm run start
```

Use `npm run db:migrate` when authoring a new migration locally. Use `prisma migrate deploy` for committed migrations in deployment. The GitHub Actions workflow validates pull requests and main pushes, then runs a serialized migration job on successful main pushes. Its production database environment bindings are currently commented out; configure secrets and the job's environment before relying on that migration stage. The existence of that workflow does not establish successful deployment or backups.

The handbook is built and checked in CI as a local artifact. It is not automatically published as a public application route. Download the HTML artifact or open docs/index.html from the repository.

## Daily overdue job

The committed schedule invokes GET `/api/cron/loans/overdue` daily at 00:00 UTC, which is 03:00 in Kampala. Configure CRON_SECRET and deploy the scheduling configuration to register it. On another host, configure its scheduler to send the same bearer-authenticated request. The function's declared maximum duration is 60 seconds.

The job flags PENDING/PARTIAL installments earlier than today's Kampala date on ACTIVE/DEFAULTED loans. It preserves paid, waived, closed and due-today installments. It does not change the amount owed, add penalties or default loans. Busy loans are skipped and reconsidered on a later invocation. Successful zero-change runs and failed attempts reaching the handler are audited under LoanSchedule with `job: loans-overdue`.

For failures, inspect function logs and the audit outcome, correct configuration or database issues, then retry the authenticated endpoint. Do not put the bearer secret in URLs or documentation examples. See [job operations](../jobs/README.md).

## Verification commands

```bash
npm run lint
npm run typecheck
npm run test
npm run docs:test
npm run docs:check
npm run build
```

The loan and investment integration runners require separately created disposable local databases with their exact test names. They reject remote hosts, apply migrations to those databases and retain synthetic records. Ordinary unit tests skip those integration suites unless their corresponding environment variable is set.

```bash
npm run test:loans:integration
npm run test:investments:integration
```

## Known pilot boundaries

Password recovery exposes preview tokens and notification records are stored without email/SMS delivery. Membership changes do not synchronize login/account suspension automatically. Savings exports have no EXPORT audit event; some early authorization failures bypass mutation auditing. Staff-only account management, a full audit viewer, portfolio reporting, receipt corrections/waivers and automated investment proceeds are not implemented screens. Backup retention, monitoring integration, broad security review and operational sign-off remain deployment responsibilities tracked by the build specification. `/handbook` serves the built handbook as a standalone document outside the session proxy, so it opens without signing in (it includes this endpoint and data reference); `/api/handbook` requires a session. The member dashboard's loan-earnings estimate recalculates across the full ledger on each load, which suits pilot volumes but should be cached as membership grows.

Source references: [package scripts](../package.json), [Prisma configuration](../prisma.config.ts), [bootstrap script](../scripts/bootstrap-admin.ts), [audit wrapper](../lib/audit/mutation.ts), [CI workflow](../.github/workflows/ci.yml), [build specification](../agent.md).

