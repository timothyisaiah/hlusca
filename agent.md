# AGENT.md — HLUSCA SACCO Management Platform

> This document is the build specification for an AI coding agent (or human dev team)
> tasked with implementing **HLUSCA**, a Savings, Investments and Loans (SACCO)
> management platform, as a single-page application (SPA). Follow this spec as the
> source of truth. Where ambiguity exists, prefer the simplest solution that keeps
> operational and administrative overhead low — this is a **pilot deployment**.

---

## 1. Product Summary

HLUSCA is a member-owned SACCO (Savings and Credit Cooperative) platform that lets an
organization:

- Enroll and manage members with role-based access (Client, Treasurer, Board, Administrator).
- Track member savings, deposits, withdrawals, and investment returns/dividends.
- Accept, review, approve/reject loan applications.
- Generate loan contracts, capture member e-signature, disburse funds.
- Auto-generate repayment schedules at loan creation and reconcile payments against them.
- Give every member a self-service portal showing their transaction history, savings
  balance, and full loan statement.
- Maintain an immutable audit log of every create/edit/delete/failed action in the system.

**Non-goals for pilot:** multi-branch/multi-currency support, mobile native apps,
integration with core banking systems, SMS/USSD channels (may be phase 2).

---

## 2. Guiding Constraints

- **Lowest possible operational and administrative cost.** Prefer managed
  services with generous free/low tiers over self-hosted infrastructure.
- **Single deployable unit** where possible (monolith over microservices) to reduce
  DevOps overhead for a small pilot team.
- **Boring, well-documented technology.** Avoid exotic frameworks; prioritize
  maintainability by a small team.
- **Security and auditability are non-negotiable** even at pilot scale — this handles
  members' money.

---

## 3. Recommended Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | **React + TypeScript** (Vite or Next.js in SPA/CSR mode) | Single codebase, huge ecosystem, easy hiring |
| UI Kit | **Tailwind CSS + shadcn/ui** | Fast, consistent, no design system to maintain from scratch |
| Backend | **Next.js API routes** (or a lightweight **Node.js/Express** service) in the *same repo* | One deployable, one language (TS) across stack |
| ORM | **Prisma** | Type-safe schema, migrations, works great with Postgres |
| Database | **PostgreSQL** (hosted on **Supabase** or **Neon**, free/low tier) | Relational integrity needed for ledgers; managed = zero DBA overhead |
| Auth | **NextAuth (Auth.js) Credentials provider** backed by our own `User` table + bcrypt/argon2 password hashing | Supabase Auth and most managed providers assume email as the primary identifier; since many members won't have email, a custom credentials login against our own table is simpler than forcing an email-first managed provider to do something it isn't built for (see §5.1 and §7.2 for the multi-identifier design) |
| File storage (contracts, signatures) | **Supabase Storage** or **Cloudflare R2** | Cheap object storage, signed URLs |
| E-signature | Lightweight in-house signature pad (canvas → PNG) + hash + timestamp, OR **Documenso** (open-source, self-hostable) if legal-grade e-sign is required later | Avoid paid DocuSign-tier costs in pilot |
| Hosting | **Vercel** (frontend + API routes) | Free tier sufficient for pilot; zero server management |
| Background jobs (schedule generation, FY dividend run, reminders) | **Vercel Cron** / **Supabase Edge Functions (cron)** | No separate worker infrastructure needed |
| Notifications | **Email via Resend/SendGrid free tier**; SMS deferred to phase 2 | Keep cost near zero |
| Monitoring/Logging | **Sentry (free tier)** for errors; DB-backed audit log for business events | Avoid a full ELK stack |
| CI/CD | **GitHub Actions** → Vercel auto-deploy | Free for small teams |

This stack requires **no servers to patch, no containers to orchestrate, and no
dedicated DevOps hire** — everything scales from free tiers and can migrate to paid
tiers only as membership grows.

---

## 4. Roles & Permissions

| Role | Description | Key Permissions |
|---|---|---|
| **Client (Member)** | Ordinary SACCO member | View own profile, savings, transactions, loan statements; apply for loans; sign contracts; view own dividend/interest history |
| **Treasurer** | Handles finances | Record deposits/withdrawals, disburse loans, match payments to schedules, run FY dividend/interest calculations, view all member ledgers |
| **Board** | Governance / decision-making | Review and approve/reject loan applications above a threshold, view aggregate reports, view audit log (read-only), cannot edit financial records directly |
| **Administrator** | System admin | Enroll members, manage roles, configure loan types/interest rules, full audit log access, system configuration, user management |

**Access rules:**
- Every screen and API endpoint must enforce role-based access control (RBAC) at the
  server layer — never trust client-side role checks alone.
- A member can only ever see **their own** financial data. Treasurer/Board/Admin can
  see all members' data, scoped by their permission level.
- Loan approval should support a configurable approval chain (e.g., Treasurer
  recommends → Board approves) — model this as a `LoanApprovalStep` so it can be
  extended without schema rewrites.

---

## 5. Core Domain Entities (Data Model)

Design as a Prisma schema (Postgres). Key tables:

### 5.1 Identity & Membership
```
User
  id, username (unique, nullable), email (unique, nullable), phone (unique, nullable),
  passwordHash, role (enum: CLIENT, TREASURER, BOARD, ADMIN),
  memberId (FK -> Member, nullable for staff-only accounts), status (ACTIVE/SUSPENDED),
  lastLoginAt, createdAt, updatedAt
  -- login identifier rule: a User must have AT LEAST ONE of {username, email, phone}.
  -- memberNumber is NOT stored on User directly — it is resolved at login time via
  -- the linked Member (see §7.2) since memberNumber lives on Member, not User.
  -- Enforce uniqueness with partial unique indexes (Postgres) so multiple NULLs
  -- are allowed but any non-null value must be unique, e.g.:
  --   CREATE UNIQUE INDEX user_username_unique ON "User" (username) WHERE username IS NOT NULL;
  --   CREATE UNIQUE INDEX user_email_unique    ON "User" (email)    WHERE email IS NOT NULL;
  --   CREATE UNIQUE INDEX user_phone_unique    ON "User" (phone)    WHERE phone IS NOT NULL;

Member
  id, memberNumber (unique, system-generated, see §6), firstName, lastName,
  dateOfBirth, nationalIdNumber, address, phone, email,
  nextOfKinName, nextOfKinPhone, photoUrl,
  enrollmentDate, status (PENDING/ACTIVE/SUSPENDED/EXITED),
  createdAt, updatedAt
```

### 5.2 Savings & Investments
```
SavingsAccount
  id, memberId (FK), accountNumber, balance (decimal), status, openedAt

Transaction
  id, savingsAccountId (FK), type (DEPOSIT/WITHDRAWAL/INTEREST/DIVIDEND/LOAN_DISBURSEMENT/LOAN_REPAYMENT),
  amount, balanceAfter, reference, narrative, performedById (FK -> User),
  createdAt

InvestmentProduct
  id, name, description, expectedReturnRate, riskProfile

MemberInvestment
  id, memberId (FK), investmentProductId (FK), principal, startDate,
  maturityDate, status

DividendRun   (financial-year-end batch job record)
  id, financialYear, totalPoolAmount, calculationMethod, runDate, runById, status
DividendAllocation
  id, dividendRunId (FK), memberId (FK), amount, savingsAccountId (FK)
```

### 5.3 Loans
```
LoanType
  id, name (e.g. "Emergency", "Development", "School Fees"),
  interestMethod (FLAT/REDUCING_BALANCE), interestRate, maxTermMonths,
  maxMultipleOfSavings, processingFeePercent

LoanApplication
  id, memberId (FK), loanTypeId (FK), amountRequested, termMonths, purpose,
  status (SUBMITTED/UNDER_REVIEW/APPROVED/REJECTED/CANCELLED),
  submittedAt, decidedAt, decidedById, rejectionReason

LoanApprovalStep
  id, loanApplicationId (FK), approverRole, approverId, decision, comment, decidedAt

Loan  (created only after approval + contract signed)
  id, loanApplicationId (FK), memberId (FK), principal, interestRate,
  interestMethod, termMonths, disbursementDate, status (PENDING_DISBURSEMENT/ACTIVE/CLOSED/DEFAULTED),
  outstandingBalance, contractId (FK)

LoanContract
  id, loanId (FK), documentUrl, generatedAt, memberSignedAt, memberSignatureUrl/hash,
  witnessedById, status (DRAFT/AWAITING_SIGNATURE/SIGNED/VOID)

LoanSchedule (installment plan — generated at loan creation)
  id, loanId (FK), installmentNumber, dueDate, principalDue, interestDue,
  totalDue, principalBalanceAfter, status (PENDING/PARTIAL/PAID/OVERDUE/WAIVED)

LoanPayment
  id, loanId (FK), amount, paymentDate, method, reference,
  matchedScheduleId (FK -> LoanSchedule, nullable until reconciled),
  recordedById, createdAt
```

### 5.4 Audit & System
```
AuditLog
  id, actorId (FK -> User, nullable for system/failed-auth events), actorRole,
  action (enum: CREATE/UPDATE/DELETE/APPROVE/REJECT/LOGIN/LOGIN_FAILED/DISBURSE/SIGN/EXPORT/...),
  entityType, entityId, beforeState (JSON, nullable), afterState (JSON, nullable),
  status (SUCCESS/FAILURE), failureReason (nullable), ipAddress, userAgent, createdAt

SystemSetting
  key, value, updatedById, updatedAt

Notification
  id, userId (FK), type, message, read, createdAt
```

---

## 6. Member Number Generation

- Format: `HLUSCA-{YYYY}-{sequence}` e.g. `HLUSCA-2026-000147`.
- Sequence resets or continues per year (decide at admin config; default: continuous
  running counter, not reset per year, to avoid collisions — recommend
  `HLUSCA-{sequence:6-digits}` for simplicity, e.g. `HLUSCA-000147`).
- Generation must happen inside a DB transaction using an atomic counter
  (Postgres `SERIAL`/sequence or a `SystemSetting` row with row-level locking) to avoid
  race conditions on concurrent enrollments.
- Member number is immutable once issued and is the primary human-facing identifier
  across statements, contracts, and receipts.

---

## 7. Key Workflows

### 7.1 Member Enrollment
1. Administrator (or self-service application, if enabled) captures member bio-data:
   name, address, phone/email, national ID, next of kin, photo.
2. On approval by Administrator, system:
   - Generates `memberNumber`.
   - Creates `Member` + linked `User` (role = CLIENT) + `SavingsAccount` (balance 0).
   - Writes `AuditLog` entry (CREATE, entityType=Member).
   - Sends welcome email with login instructions.
3. Member status starts as `PENDING` until first deposit / KYC document confirmed,
   then flips to `ACTIVE`.

### 7.2 Authentication with Multiple Identifiers

Not all members will have an email address, so email cannot be the sole login
identifier. **Four identifiers can each uniquely resolve to a member/user account:**

1. **Username** — chosen at enrollment (or auto-suggested from name), always required
   as the guaranteed fallback identifier for members without email or a registered phone.
2. **Email** — optional; captured if the member has one.
3. **Phone number** — optional at the `User` level but effectively the most common
   identifier in practice; stored in E.164 format and validated at enrollment.
4. **Member number** (`HLUSCA-######`) — always present (system-generated at
   enrollment, §6), so it always works as a login identifier even for a member who
   forgets everything else about their account except the number printed on their
   welcome letter/receipt.

**Login flow:**
- Single "Sign in" form with one input field labeled "Username, phone, email, or
  member number" + password field.
- Server-side resolution order on submit:
  1. If input matches member-number format (`HLUSCA-######`) → look up `Member` by
     `memberNumber`, then resolve linked `User`.
  2. Else try exact match against `User.username`.
  3. Else try exact match against `User.email`.
  4. Else normalize and try exact match against `User.phone`.
  5. If no match on any → generic "invalid credentials" error (never reveal which
     identifier type failed — avoids identifier enumeration).
- On successful resolution, verify password hash as normal; log the login
  success/failure to `AuditLog` (including which identifier type was used, for
  support/debugging purposes — this is metadata, not a security decision point shown
  to the user).
- Rate-limit by both IP and resolved-account to prevent brute force across all four
  identifier paths equally.

**Enrollment implications (updates §7.1):**
- At enrollment, Administrator must set a **username** for every member (mandatory,
  since it's the only guaranteed non-numeric fallback). Phone number should also be
  mandatory at the `Member` level (already a tracked profile field) and copied/linked
  to `User.phone` for login purposes. Email remains optional on both `Member` and `User`.
- Initial password: system generates a temporary password (or a first-login PIN sent
  via SMS if a phone number is available) and forces a password change on first login.
  If a member has no phone and no email, the temporary credential must be delivered
  in person/print by the Administrator at enrollment — capture this hand-off as an
  audit event.
- Password reset flow must support all four identifiers for "forgot password" too:
  if email exists, send reset link; else if phone exists, send OTP via SMS; else
  (username/member-number only, no contact channel) require an in-person
  Administrator-assisted reset, logged in `AuditLog`.

### 7.3 Savings Transactions
1. Treasurer records a deposit or withdrawal against a member's `SavingsAccount`.
2. System validates: withdrawal ≤ available balance minus any loan-collateral hold.
3. Creates `Transaction` row, updates `SavingsAccount.balance` atomically (DB
   transaction), writes `AuditLog`.
4. Member sees this instantly in their transaction log.

### 7.4 Financial-Year-End Interest/Dividends
1. Treasurer (or scheduled job) triggers a `DividendRun` for a financial year with a
   total pool amount and calculation method (e.g., pro-rata by average savings balance,
   or by share capital).
2. System computes `DividendAllocation` per member, creates a `Transaction`
   (type=DIVIDEND) per member, updates balances, logs everything.
3. Requires Board approval step before disbursement (`status: PROPOSED → APPROVED → POSTED`).

### 7.5 Loan Application → Disbursement
1. **Apply:** Member selects `LoanType`, requested amount, term, purpose. System
   validates against `LoanType` rules (e.g., max multiple of savings). Creates
   `LoanApplication` (status=SUBMITTED).
2. **Review:** Treasurer/Board see a queue of applications; each reviewer records a
   `LoanApprovalStep`. Business rule example: Treasurer recommends, Board gives final
   approval for amounts over a threshold; smaller loans may auto-route to a single
   approver.
3. **Decision:**
   - **Rejected:** status=REJECTED, reason captured, member notified, audit logged.
   - **Approved:** status=APPROVED → system generates `LoanContract` (PDF from
     template with member details, terms, repayment schedule preview).
4. **Contract Signing:** Member reviews and signs (digital signature capture: typed
   name + canvas signature + timestamp + IP, stored as hash for integrity). Contract
   status → SIGNED.
5. **Disbursement:** Treasurer disburses funds — creates the `Loan` record (status
   ACTIVE), a `Transaction` (type=LOAN_DISBURSEMENT) crediting the member (or paid out
   directly), and **generates the full `LoanSchedule`** (see §7.6) at this exact moment.
6. All steps write `AuditLog` entries, including rejected/failed disbursement attempts.

### 7.6 Repayment Schedule Generation
- Generated once, immediately at disbursement, based on `LoanType.interestMethod`:
  - **Flat rate:** interest = principal × rate × term, split evenly across installments.
  - **Reducing balance:** recalculate interest per period on outstanding principal
    (standard amortization formula).
- Produces one `LoanSchedule` row per installment: due date, principal portion,
  interest portion, total due, resulting balance.
- Due dates follow the loan's repayment frequency (monthly by default; support
  weekly/bi-weekly per `LoanType` if needed later).

### 7.7 Payment Matching / Reconciliation
1. Treasurer records a `LoanPayment` (amount, date, method, reference).
2. Matching logic:
   - Apply payment to the **oldest unpaid/partial `LoanSchedule`** first (FIFO),
     unless the payment reference indicates a specific installment.
   - Handle overpayment (roll forward to next installment) and underpayment
     (mark schedule row PARTIAL, track remaining due).
   - Update `LoanSchedule.status` and `Loan.outstandingBalance`.
3. Auto-flag installments as `OVERDUE` via scheduled job when `dueDate < today` and
   status is still PENDING/PARTIAL.
4. Every payment and match action is audit-logged with before/after schedule state.

### 7.8 Loan Statement (member-facing)
Displays, per loan: date, transaction type, principal component, interest component,
running loan balance — essentially a ledger view built from `LoanSchedule` +
`LoanPayment` joined and sorted chronologically, plus a printable/exportable PDF.

---

## 8. Audit Logging Requirements

**Every** state-changing action and every failed attempt must produce an `AuditLog`
row. This includes but is not limited to:

- Auth: login success/failure, password reset, role changes.
- Member: create/update/suspend/delete.
- Savings: deposit, withdrawal, correction/reversal.
- Loans: application submit, each approval-step decision, contract generation,
  signature capture, disbursement, payment recorded, schedule adjustment/waiver.
- Dividends: run created, approved, posted.
- Admin: loan-type config changes, system setting changes, user role changes.
- Any **failed** action (validation error stopping a financial write, unauthorized
  access attempt, failed disbursement) — log with `status=FAILURE` and a reason.

**Design rules:**
- Audit log is **append-only** — no UPDATE/DELETE permitted on `AuditLog` at the
  application layer or DB role level (revoke UPDATE/DELETE grants for the app's DB
  user on this table).
- Store `beforeState`/`afterState` as JSON snapshots for financial records so any
  action is fully reconstructable.
- Board and Administrator roles get a searchable/filterable audit log viewer
  (by member, date range, action type, actor).
- Consider write-through to an external append-only log (e.g., a cheap object storage
  bucket with daily JSON exports) as a low-cost tamper-evidence backup.

---

## 9. Member Self-Service Portal (Client role)

Dashboard should surface, at a glance:
- Member number, name, status, savings balance, active loan(s) summary.
- **Transaction log**: deposits, withdrawals, interest, dividends — filterable by
  date range and type, paginated, exportable to PDF/CSV.
- **Loan section**: current applications and their status, active loan(s) with
  statement (date, principal, interest, balance), full repayment schedule with
  paid/pending/overdue indicators, downloadable signed contract.
- **Apply for a loan** action with real-time eligibility hints (e.g., max eligible
  amount based on savings multiple).
- Profile view/edit request (address/phone changes may require Admin approval —
  log as an audit event either way).

---

## 10. Treasurer / Board / Administrator Views

- **Treasurer:** member ledger search, record deposit/withdrawal, loan disbursement
  queue, payment recording & reconciliation screen, overdue-loans report, dividend
  run wizard.
- **Board:** pending loan approvals queue (with member savings history and repayment
  track record shown inline for informed decisions), dividend run approval,
  read-only audit log, portfolio-level reports (total savings, loans outstanding,
  default rate, growth trends).
- **Administrator:** member enrollment, role/user management, loan type & interest
  rule configuration, full audit log, system settings, data export/backup triggers.

---

## 11. Suggested API Surface (REST)

```
POST   /api/auth/login             (body: { identifier, password } — identifier may
                                     be username, email, phone, or member number;
                                     resolution order per §7.2)
POST   /api/auth/logout
POST   /api/auth/reset-password    (body: { identifier } — routes to email link,
                                     SMS OTP, or "contact administrator" per §7.2)
GET    /api/members            (list, role-scoped)
POST   /api/members            (enroll)
GET    /api/members/:id
PATCH  /api/members/:id
GET    /api/members/:id/transactions
GET    /api/members/:id/savings
POST   /api/savings/:accountId/deposit
POST   /api/savings/:accountId/withdraw

GET    /api/loan-types
POST   /api/loan-applications
GET    /api/loan-applications?status=&memberId=
POST   /api/loan-applications/:id/approve
POST   /api/loan-applications/:id/reject
POST   /api/loan-applications/:id/contract        (generate)
POST   /api/contracts/:id/sign
POST   /api/loans/:id/disburse
GET    /api/loans/:id/schedule
GET    /api/loans/:id/statement
POST   /api/loans/:id/payments

POST   /api/dividend-runs
POST   /api/dividend-runs/:id/approve
POST   /api/dividend-runs/:id/post

GET    /api/audit-logs?entityType=&actorId=&from=&to=
```
All mutating endpoints must: authenticate → authorize (RBAC) → validate input →
perform DB transaction → write audit log → return result. Wrap steps 3–4 in a single
DB transaction so a failed audit write rolls back the business change (or vice versa
— never allow an unaudited financial mutation to persist).

---

## 12. UI/UX Guidelines

- **SPA shell** with persistent sidebar nav scoped by role (nav items hidden, not
  just disabled, for unauthorized sections).
- Use a clean, trustworthy financial-app aesthetic: neutral background, one accent
  color for primary actions, clear typographic hierarchy for monetary values
  (large, tabular-figures font for balances).
- Every money value: consistent currency formatting, always show currency code.
- Tables (transactions, schedules, applications) need: search, filter by
  date/status/type, pagination, and CSV/PDF export.
- Loan application form: multi-step wizard (Loan type & amount → Terms & purpose →
  Review & submit) with live eligibility/affordability preview.
- Contract signing screen: full contract preview, explicit "I agree" checkbox,
  signature pad, confirmation modal before final submit (this is a legal action —
  make it deliberate, not a single accidental click).
- Dashboards use simple charts (savings growth over time, loan balance amortization
  curve) — keep charts optional/secondary to the numeric tables for a finance app.
- Mobile-responsive since members may access via phone browsers primarily.
- Accessibility: proper form labels, sufficient contrast, keyboard navigation for
  all financial forms.

---

## 13. Security & Compliance Notes

- Passwords hashed with bcrypt/argon2; enforce minimum complexity.
- All financial mutation endpoints require re-auth or step-up (e.g., password
  confirm) for high-value actions (large withdrawal, loan disbursement).
- Role checks enforced server-side on every request, not just UI-hidden.
- PII (national ID, address, phone) encrypted at rest where the hosting provider
  supports column-level encryption, or at minimum access-restricted by role.
- Rate-limit login endpoint; log and alert on repeated failures (feeds AuditLog).
- Daily automated DB backups (managed Postgres providers include this by default —
  confirm retention policy meets pilot compliance needs).
- Maintain a data retention/deletion policy consistent with local cooperative/financial
  regulations (confirm with legal counsel before go-live — out of scope for this doc).

---

## 14. Suggested Repository Structure

```
/hlusca
  /app                # Next.js app router (SPA-style client components)
    /(auth)
    /dashboard
      /client
      /treasurer
      /board
      /admin
    /api               # API route handlers
  /components
    /ui                # shadcn/ui primitives
    /forms
    /tables
  /lib
    /auth
    /audit             # audit-log helper (wrap-and-log utility)
    /loans             # schedule generation, interest calculators
    /savings
    /pdf               # contract & statement generation
  /prisma
    schema.prisma
    migrations/
  /scripts             # one-off/admin scripts (e.g., seed data)
  /jobs                # cron job handlers (overdue flagging, dividend runs)
  agent.md
  README.md
```

---

## 15. Build Phases (Pilot Roadmap)

1. **Foundation:** Auth, roles, DB schema, member enrollment, audit-log utility wired
   into a base "mutation wrapper" used by every write endpoint.
2. **Savings module:** deposits/withdrawals, member transaction log UI.
3. **Loans module:** application → review → approval workflow, loan types config.
4. **Contracts & disbursement:** contract generation/signature, disbursement,
   schedule generation.
5. **Repayments:** payment recording, matching/reconciliation, overdue flagging job,
   loan statement UI.
6. **Investments & dividends:** investment products, FY dividend run + approval flow.
7. **Reporting & audit UI:** admin/board dashboards, audit log viewer, exports.
8. **Hardening:** security review, backup verification, load-test with realistic
   pilot member counts, UAT with real Treasurer/Board users.

---

## 16. Testing Strategy

- Unit tests for interest/amortization calculators (flat vs reducing balance) —
  these are financial-correctness critical.
- Unit tests for payment-matching/reconciliation logic (partial payments,
  overpayments, out-of-order payments).
- Integration tests for the full loan lifecycle (apply → approve → sign → disburse →
  schedule → pay → close).
- Test that every mutating endpoint produces exactly one corresponding `AuditLog` row,
  including on the failure path.
- RBAC tests: verify a Client role cannot access another member's data or any
  Treasurer/Board/Admin endpoint.

---

## 17. Resolved Business Decisions

These were open questions and are now settled — implement to these rules directly
(update this section, not the workflow sections above, if they change later):

| # | Question | Decision | Implementation note |
|---|---|---|---|
| 1 | Dividend calculation method | **Pro-rata by savings balance.** | `DividendAllocation.amount` for each member = `(member's average/eligible savings balance ÷ total pool-eligible savings across all members) × totalPoolAmount`. Confirm and hardcode "average balance over the financial year" (not point-in-time) as the balance basis in `DividendRun.calculationMethod`, since this is the fairer and more common SACCO standard — flag to Treasurer/Admin as a configurable label even though only one method ships in pilot. |
| 2 | Loan approval threshold/chain | **Loans ≤ 2,999,999 (currency units) require only Treasurer sign-off. Loans ≥ 3,000,000 additionally require Board approval.** | Store threshold as a `SystemSetting` (`LOAN_BOARD_APPROVAL_THRESHOLD = 3000000`), not a hardcoded constant, so Admin can tune it without a deploy. `LoanApplication` routing logic: if `amountRequested < threshold` → single `LoanApprovalStep` (Treasurer) is sufficient to move to APPROVED; if `amountRequested >= threshold` → require Treasurer step AND Board step, both APPROVED, before status flips to APPROVED. |
| 3 | E-signature legal validity | **Simple canvas signature + audit trail is sufficient for pilot.** | No third-party e-sign provider needed. `LoanContract` capture = canvas-drawn signature image (PNG), typed full name confirmation, timestamp, IP address, user agent — all persisted and also written to `AuditLog` (action=SIGN) as the audit trail. Revisit if regulator/legal requires certified e-sign post-pilot. |
| 4 | Savings withdrawal limits/notice | **No withdrawal limit and no notice period.** | Remove any minimum-notice or max-per-transaction validation from the withdrawal endpoint. The only hard check remaining is: withdrawal amount ≤ current available `SavingsAccount.balance` (minus any amount held as loan collateral, if that rule applies — confirm separately if loans require a savings-based collateral hold). |
| 5 | Member enrollment path | **Admin-only enrollment.** No member self-enrollment/self-service sign-up. | Do not build a public registration page. The only enrollment entry point is the Administrator's "Enroll Member" screen (§7.1). `Member.status` still starts `PENDING` until first deposit, per existing rule. |

---

## 18. Implementation Checklist

Use this as the living progress tracker for the build. Check items off as they ship;
keep it in sync with the phases in §15.

### Phase 0 — Project Setup
- [x] Repo initialized with structure from §14
- [x] Next.js + TypeScript + Tailwind + shadcn/ui scaffolded
- [x] Postgres provisioned (Supabase/Neon) + Prisma connected
- [x] Auth provider configured (Supabase Auth / NextAuth) with email+password
- [ ] CI/CD pipeline (GitHub Actions → Vercel) working on a "hello world" deploy
- [x] `SystemSetting` table + helper (get/set) implemented, seeded with
      `LOAN_BOARD_APPROVAL_THRESHOLD = 3000000`

### Phase 1 — Foundation: Auth, Roles, Audit, Members
- [x] `User` + `Member` schema migrated
- [x] Role enum (CLIENT/TREASURER/BOARD/ADMIN) + RBAC middleware on all API routes
- [x] Central "mutation wrapper" utility that writes `AuditLog` for every write
      (success and failure paths) — built and unit-tested before any other module uses it
- [x] Admin "Enroll Member" screen (admin-only, per decision #5), with mandatory
      username + phone capture and optional email, per §7.2
- [x] Member number generator (`HLUSCA-######`, atomic/collision-safe) implemented + tested
- [x] Member profile view/edit (with audit logging on edits)
- [x] Partial unique indexes on `User.username`/`email`/`phone` (nullable-safe uniqueness)
- [x] Multi-identifier login resolution implemented + tested: member number →
      username → email → phone, in that order, with generic error on no match (§7.2)
- [ ] Temporary password / first-login PIN issuance flow (SMS if phone available,
      in-person hand-off + audit log if not)
- [x] Forced password change on first login
- [x] "Forgot password" flow branching by available identifier (email link / SMS OTP /
      administrator-assisted reset), each path audit-logged
- [x] Login/logout, failed-login logging (including which identifier type was used,
      as metadata only — never exposed to the end user)
- [x] Role-scoped nav shell (sidebar differs per role)

### Phase 2 — Savings Module
- [x] `SavingsAccount` created automatically on enrollment (balance 0)
- [ ] Deposit endpoint + UI (Treasurer)
- [ ] Withdrawal endpoint + UI — **no limit, no notice period** (decision #4), only
      balance-sufficiency check
- [ ] `Transaction` ledger writes on every deposit/withdrawal, atomic with balance update
- [ ] Member-facing transaction log (filter by date/type, paginate, CSV/PDF export)
- [ ] Audit log entries verified for all savings mutations

### Phase 3 — Loan Application & Approval
- [ ] `LoanType` config screen (Admin) — interest method, rate, max term, max
      multiple of savings, processing fee
- [ ] Loan application wizard (Client) with eligibility preview
- [ ] Application routing logic implemented per decision #2:
  - [ ] `< threshold` → Treasurer-only approval path
  - [ ] `>= threshold` → Treasurer + Board dual approval path
- [ ] Treasurer/Board review queues with approve/reject + comment
- [ ] Rejection flow (reason captured, member notified, audit logged)
- [ ] Threshold read from `SystemSetting`, not hardcoded — verified with a test that
      changes the setting and confirms routing changes accordingly

### Phase 4 — Contracts, Signature & Disbursement
- [ ] Contract PDF generation from approved application (template with terms +
      schedule preview)
- [ ] Signature capture screen: canvas pad + typed name + explicit confirm step
      (decision #3 — no third-party e-sign integration)
- [ ] Signature + timestamp + IP/user-agent persisted on `LoanContract`
- [ ] `AuditLog` SIGN event written alongside contract signature (this *is* the legal
      audit trail per decision #3)
- [ ] Disbursement action (Treasurer): creates `Loan`, `Transaction`
      (LOAN_DISBURSEMENT), and triggers schedule generation in one DB transaction

### Phase 5 — Repayment Schedule & Reconciliation
- [ ] Schedule generator: flat-rate method implemented + unit tested
- [ ] Schedule generator: reducing-balance method implemented + unit tested
- [ ] Payment recording endpoint + UI (Treasurer)
- [ ] FIFO payment-matching logic (oldest unpaid installment first)
- [ ] Partial payment handling (status=PARTIAL, remaining-due tracking)
- [ ] Overpayment handling (roll forward to next installment)
- [ ] Scheduled job: auto-flag overdue installments (daily cron)
- [ ] Member-facing loan statement (date/principal/interest/balance ledger view + PDF export)
- [ ] Audit log entries verified for all payment/schedule mutations

### Phase 6 — Investments & Dividends
- [ ] `InvestmentProduct` + `MemberInvestment` schema and admin config screen
- [ ] `DividendRun` creation (Treasurer), pro-rata-by-average-balance calculation
      implemented per decision #1
- [ ] Board approval step for `DividendRun` before posting
- [ ] Posting a dividend run creates `DividendAllocation` rows + `Transaction`
      (DIVIDEND) per member + balance updates, all atomic
- [ ] Member dashboard shows dividend history

### Phase 7 — Reporting & Audit UI
- [ ] Admin/Board audit log viewer: filter by actor, entity type, date range, action, status
- [ ] Portfolio-level reports: total savings, loans outstanding, default/overdue rate,
      growth trend charts
- [ ] Export (CSV/PDF) on all major report and ledger views

### Phase 8 — Hardening & Pilot Readiness
- [ ] Security review: RBAC coverage test across all endpoints (Client cannot access
      other members' data or staff endpoints)
- [ ] Verify `AuditLog` table has UPDATE/DELETE revoked at the DB role level
- [ ] Backup policy confirmed with hosting provider (retention window documented)
- [ ] Load test with realistic pilot member/loan volumes
- [ ] Full lifecycle integration test: apply → approve (both routing paths) → sign →
      disburse → schedule → pay (partial + full + overpay) → close
- [ ] UAT sign-off from a real Treasurer and Board user
- [ ] Go-live checklist: env vars set, `SystemSetting` values confirmed for
      production, monitoring (Sentry) wired

---

*End of specification. Implementers should treat §5 (data model), §7 (workflows), and
§17 (resolved decisions) as authoritative for schema and business-logic decisions, and
should not introduce additional infrastructure components beyond §3 without
revisiting the "least operational overhead" constraint. Use §18 to track and report
build progress.*

---

*End of specification. Implementers should treat §5 (data model) and §7 (workflows)
as authoritative for schema and business-logic decisions, and should not introduce
additional infrastructure components beyond §3 without revisiting the "least
operational overhead" constraint.*
