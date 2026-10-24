> Generated from application source and docs/catalog.mjs. Refresh with npm run docs:generate; edit the catalog or application source, not this file.

# Endpoint reference

Each heading represents one exported HTTP operation. Authentication catch-all subpaths are delegated to NextAuth. Request examples are illustrative: replace IDs, dates, tokens and passwords with valid values. See [API conventions](../api.md) for shared errors and session requirements.

## GET /api/auth/{...nextauth}

**Read authentication/session resources** · Access

| Contract | Details |
| --- | --- |
| Authentication | framework |
| Request | NextAuth catch-all handler. The application uses the Credentials provider with identifier and password, plus NextAuth session cookies and CSRF handling. Use the signIn/signOut client helpers. GET includes session, csrf, providers and sign-in resources; POST includes callback/credentials and signout. See API conventions for the delegated-handler boundary. |
| Success response | NextAuth-managed JSON, HTML or redirect depending on the subpath, request and session state; this is not the application's ordinary JSON error contract. |
| Conditions | Credentials must match an ACTIVE login account. Identifier may be a member number, username, phone or email. Sign-out uses the current session. |
| Effects and audit | Successful sign-in updates lastLoginAt and writes LOGIN; rejected credentials write LOGIN_FAILED. Sign-out writes LOGOUT when a token user exists. |
| Errors | Framework-managed authentication and CSRF errors; invalid credentials are surfaced by the sign-in form. |
| Screen | `/sign-in` |
| Source | [`app/api/auth/[...nextauth]/route.ts`](../../app/api/auth/%5B...nextauth%5D/route.ts) |
| Extracted guard | `delegated`; effective conditions reviewed from handler/service |

```http
GET /api/auth/session HTTP/1.1
Host: localhost:3000
```

## GET /api/contracts/{id}/document

**Download the retained agreement PDF** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | No request body. |
| Success response | 200 application/pdf, inline HLUSCA-loan-contract.pdf; private, no-store and nosniff headers. |
| Conditions | Member: own agreement; staff: any agreement. id is the contract ID. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 404 document absent or outside ownership; shared 401/403/500/503 errors. |
| Screen | `/dashboard/loans/{id}` |
| Source | [`app/api/contracts/[id]/document/route.ts`](../../app/api/contracts/%5Bid%5D/document/route.ts) |
| Extracted guard | `loanRead`; effective conditions reviewed from handler/service |

```http
GET /api/contracts/id-demo/document HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/contracts/{id}/signature

**View the saved signature image** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | No request body. |
| Success response | 200 image/png; private, no-store and nosniff headers. |
| Conditions | Member: own contract; staff: any contract. A signature must have been stored. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 404 signature absent or outside ownership; shared 401/403/500/503 errors. |
| Screen | `/dashboard/loans/{id}` |
| Source | [`app/api/contracts/[id]/signature/route.ts`](../../app/api/contracts/%5Bid%5D/signature/route.ts) |
| Extracted guard | `loanRead`; effective conditions reviewed from handler/service |

```http
GET /api/contracts/id-demo/signature HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/cron/loans/overdue

**Flag overdue installments** · Operations

| Contract | Details |
| --- | --- |
| Authentication | service |
| Request | Authorization: Bearer <CRON_SECRET>. No request body or session cookie required. Configured secret must contain at least 32 characters. |
| Success response | 200 { date: YYYY-MM-DD, updated: number }; Cache-Control: no-store. |
| Conditions | Scheduler secret required; ordinary role membership grants no access. Selects PENDING/PARTIAL installments before today's Kampala date on ACTIVE/DEFAULTED loans. |
| Effects and audit | Updates overdue status only, preserving paid/waived/closed/due-today rows. Does not add penalties or default loans. Locks Loan rows first; busy loans are skipped until a later invocation. UPDATE LoanSchedule audit includes zero-change successes and failures. |
| Errors | 401 invalid or missing bearer token; 503 missing/short CRON_SECRET; shared 500/503 errors. |
| Screen | API/framework operation; no dedicated application action button |
| Source | [`app/api/cron/loans/overdue/route.ts`](../../app/api/cron/loans/overdue/route.ts) |
| Extracted guard | `custom`; effective conditions reviewed from handler/service |

```http
GET /api/cron/loans/overdue HTTP/1.1
Host: localhost:3000
Authorization: Bearer <CRON_SECRET>
```

## GET /api/dividend-history

**View posted dividend history** · Dividends

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | Optional query memberId. Members are always restricted to their linked memberId; another ID is forbidden. Staff may omit memberId to list all members' records. |
| Success response | 200 DividendHistoryRecord[]: id, amount, averageBalance and run { financialYear, periodStart, periodEnd, postedAt }. |
| Conditions | Member: own history; staff: any member. Only POSTED runs appear. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 401 unauthenticated; 403 access denied or password change required; 500 unexpected error; 503 database busy where reported by the common handler. |
| Screen | `/dashboard/client`, `/dashboard/investments` |
| Source | [`app/api/dividend-history/route.ts`](../../app/api/dividend-history/route.ts) |
| Extracted guard | `loanRead`; effective conditions reviewed from handler/service |

**Validation expression(s), extracted from the handler:**

```ts
memberFilterSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
GET /api/dividend-history HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/dividend-runs

**Review dividend runs and allocations** · Dividends

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer, Board, Administrator |
| Request | No request body. |
| Success response | 200 RunRecord[] with financial-year period, pool, calculation method, frozen calculationSnapshot, status, creator/reviewer names and timestamps. |
| Conditions | Staff roles only. Member history is served by /api/dividend-history. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 401 unauthenticated; 403 access denied or password change required; 500 unexpected error; 503 database busy where reported by the common handler. |
| Screen | `/dashboard/dividends` |
| Source | [`app/api/dividend-runs/route.ts`](../../app/api/dividend-runs/route.ts) |
| Extracted guard | `loanRead`; effective conditions reviewed from handler/service |

```http
GET /api/dividend-runs HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/earnings-history

**View credited loan earnings** · Earnings

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | Optional query memberId. Members are always restricted to their linked memberId; another ID is forbidden. Staff may omit memberId to list all members' records. |
| Success response | 200 EarningsHistoryRecord[]: id, amount, earningDays and run { month, periodEnd, postedAt }. |
| Conditions | Member: own history; staff: any member. Only credited (non-retained) shares of POSTED runs appear. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 401 unauthenticated; 403 access denied or password change required; 500 unexpected error; 503 database busy where reported by the common handler. |
| Screen | `/dashboard/client` |
| Source | [`app/api/earnings-history/route.ts`](../../app/api/earnings-history/route.ts) |
| Extracted guard | `loanRead`; effective conditions reviewed from handler/service |

**Validation expression(s), extracted from the handler:**

```ts
memberFilterSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
GET /api/earnings-history HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/earnings-runs

**Review member earnings runs** · Earnings

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer, Board, Administrator |
| Request | No request body. |
| Success response | 200 EarningsRunRecord[] (latest 60): month, periodEnd, interestCollected, memberSharePercent, memberPool, reserveAmount, forfeitedAmount, status, frozen calculationSnapshot { method, firstDay, lastDay, shares[], loans[] }, proposer/poster names and timestamps. |
| Conditions | Staff roles only. Member history is served by /api/earnings-history. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 401 unauthenticated; 403 access denied or password change required; 500 unexpected error; 503 database busy where reported by the common handler. |
| Screen | `/dashboard/earnings` |
| Source | [`app/api/earnings-runs/route.ts`](../../app/api/earnings-runs/route.ts) |
| Extracted guard | `loanRead`; effective conditions reviewed from handler/service |

```http
GET /api/earnings-runs HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/earnings-settings

**Read the member earnings share** · Earnings

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | No request body. |
| Success response | 200 { memberSharePercent: decimal string }. |
| Conditions | All authenticated roles may read this API; the setting is edited on Member Earnings by an Administrator. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 401 unauthenticated; 403 access denied or password change required; 500 unexpected error; 503 database busy where reported by the common handler. |
| Screen | `/dashboard/earnings` |
| Source | [`app/api/earnings-settings/route.ts`](../../app/api/earnings-settings/route.ts) |
| Extracted guard | `loanRead`; effective conditions reviewed from handler/service |

```http
GET /api/earnings-settings HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/handbook

**Download the built application handbook** · Operations

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | No request body. |
| Success response | 200 text/html (docs/index.html) with Cache-Control: no-cache; 404 text/plain when the handbook has not been built. |
| Conditions | Any signed-in user; the proxy rejects requests without a session. The handler itself performs no role check. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 401 unauthenticated (proxy); 404 handbook not built. |
| Screen | API/framework operation; no dedicated application action button |
| Source | [`app/api/handbook/route.ts`](../../app/api/handbook/route.ts) |
| Extracted guard | `custom`; effective conditions reviewed from handler/service |

```http
GET /api/handbook HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/investment-products

**List investment products** · Investments

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | No request body. |
| Success response | 200 ProductRecord[]: id, name, description, expectedReturnRate, riskProfile, active (and serialized stored fields). |
| Conditions | All authenticated roles. Administrator sees inactive products; others see active products only. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 401 unauthenticated; 403 access denied or password change required; 500 unexpected error; 503 database busy where reported by the common handler. |
| Screen | `/dashboard/investments` |
| Source | [`app/api/investment-products/route.ts`](../../app/api/investment-products/route.ts) |
| Extracted guard | `loanRead`; effective conditions reviewed from handler/service |

```http
GET /api/investment-products HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/investments

**View member investment holdings** · Investments

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | Optional query memberId. Members are always restricted to their linked memberId; another ID is forbidden. Staff may omit memberId to list all members' records. |
| Success response | 200 InvestmentRecord[] including member, productName, principal, expectedReturnRate, riskProfile, dates and status; decimal values are strings. |
| Conditions | Member: own investments. Staff: any member's investments. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 401 unauthenticated; 403 access denied or password change required; 500 unexpected error; 503 database busy where reported by the common handler. |
| Screen | `/dashboard/investments` |
| Source | [`app/api/investments/route.ts`](../../app/api/investments/route.ts) |
| Extracted guard | `loanRead`; effective conditions reviewed from handler/service |

**Validation expression(s), extracted from the handler:**

```ts
memberFilterSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
GET /api/investments HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/loan-applications

**List loan applications** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | Optional query: status (SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, CANCELLED), query (up to 100 characters), memberId, page (1–100000; default 1), queue (true/false; default false), from and to (YYYY-MM-DD; start must not follow end). JSON pages contain 10 applications. Member scope is enforced even when memberId is supplied. |
| Success response | 200 { applications: ApplicationRecord[], total, page, pageSize }. |
| Conditions | Member: own applications. Staff: all applications subject to filters. queue=true selects the current review role's pending steps; Board queue excludes applications still awaiting Treasurer review. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 401 unauthenticated; 403 access denied or password change required; 500 unexpected error; 503 database busy where reported by the common handler. |
| Screen | `/dashboard/loans` |
| Source | [`app/api/loan-applications/route.ts`](../../app/api/loan-applications/route.ts) |
| Extracted guard | `loanRead`; effective conditions reviewed from handler/service |

**Validation expression(s), extracted from the handler:**

```ts
applicationFiltersSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
GET /api/loan-applications?queue=true&page=1 HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/loan-applications/{id}

**View a loan application** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | No request body. |
| Success response | 200 ApplicationRecord with member, approvalSteps, retained contract metadata and loan if disbursed. |
| Conditions | Member: own application; staff: any application. id is the application ID. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 404 application absent or outside Member ownership; shared 401/403/500/503 errors. |
| Screen | `/dashboard/loans/{id}` |
| Source | [`app/api/loan-applications/[id]/route.ts`](../../app/api/loan-applications/%5Bid%5D/route.ts) |
| Extracted guard | `loanRead`; effective conditions reviewed from handler/service |

```http
GET /api/loan-applications/id-demo HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/loan-applications/export

**Export loan applications** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | Optional query: status (SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, CANCELLED), query (up to 100 characters), memberId, page (1–100000; default 1), queue (true/false; default false), from and to (YYYY-MM-DD; start must not follow end). JSON pages contain 10 applications. Member scope is enforced even when memberId is supplied. Required format=csv or pdf. page is overridden to 1; limit is 5,000 matching applications. |
| Success response | 200 text/csv or application/pdf attachment with private, no-store caching. |
| Conditions | Same ownership and filtering as application list. Narrow filters when more than 5,000 records match. |
| Effects and audit | EXPORT LoanApplication audit with filters, format and count; failures reaching the audited handler are logged. |
| Errors | 400 invalid format/filters or export too large; shared 401/403/500/503 errors. |
| Screen | `/dashboard/loans` |
| Source | [`app/api/loan-applications/export/route.ts`](../../app/api/loan-applications/export/route.ts) |
| Extracted guard | `custom`; effective conditions reviewed from handler/service |

**Validation expression(s), extracted from the handler:**

```ts
z
          .enum(["csv", "pdf"])

applicationFiltersSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
GET /api/loan-applications/export?format=csv&status=APPROVED HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/loan-applications/preview

**Preview loan eligibility and repayment** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Member |
| Request | Required query: loanTypeId, amountRequested (positive decimal string), termMonths (integer 1–360). Purpose is not required for a preview. |
| Success response | 200 { eligible, reasons: string[], savingsBalance, maximumAmount, approvalRoles, processingFee, netDisbursement, totalInterest, totalRepayable, schedule } (monetary values are decimal strings; schedule is a preview). |
| Conditions | Member account required; product must be active. Eligibility reasons include inactive membership/account, excessive term, insufficient savings-based limit and nonpositive net disbursement. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 400 invalid query; 403 non-Member or missing membership; 404 inactive/missing loan type; shared 401/500/503 errors. |
| Screen | `/dashboard/loans/apply` |
| Source | [`app/api/loan-applications/preview/route.ts`](../../app/api/loan-applications/preview/route.ts) |
| Extracted guard | `loanRead`; effective conditions reviewed from handler/service |

**Validation expression(s), extracted from the handler:**

```ts
previewSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
GET /api/loan-applications/preview?loanTypeId=product-demo&amountRequested=300000.00&termMonths=12 HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/loan-settings

**Read the Board approval threshold** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | No request body. |
| Success response | 200 { threshold: decimal string }. |
| Conditions | All authenticated roles may read this API; its configuration screen is Administrator-only. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 401 unauthenticated; 403 access denied or password change required; 500 unexpected error; 503 database busy where reported by the common handler. |
| Screen | `/dashboard/admin/loan-types` |
| Source | [`app/api/loan-settings/route.ts`](../../app/api/loan-settings/route.ts) |
| Extracted guard | `loanRead`; effective conditions reviewed from handler/service |

```http
GET /api/loan-settings HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/loan-types

**List loan products** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | No request body. |
| Success response | 200 array of loan types with rates, term limits, savings multiple, fee and active flag. |
| Conditions | All signed-in roles. Administrator sees inactive products; other roles see active products only. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 401 unauthenticated; 403 access denied or password change required; 500 unexpected error; 503 database busy where reported by the common handler. |
| Screen | `/dashboard/loans/apply`, `/dashboard/admin/loan-types` |
| Source | [`app/api/loan-types/route.ts`](../../app/api/loan-types/route.ts) |
| Extracted guard | `loanRead`; effective conditions reviewed from handler/service |

```http
GET /api/loan-types HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/loans/{id}/schedule

**Read a loan repayment schedule** · Repayments

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | No request body. |
| Success response | 200 ordered LoanSchedule array with due dates, principalDue, interestDue, totalDue, principalBalanceAfter, principalPaid, interestPaid and status. |
| Conditions | Member: own loan; staff: any loan. id is the Loan ID from a disbursed application. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 404 loan absent or outside ownership; shared 401/403/500/503 errors. |
| Screen | `/dashboard/loans/{id}` |
| Source | [`app/api/loans/[id]/schedule/route.ts`](../../app/api/loans/%5Bid%5D/schedule/route.ts) |
| Extracted guard | `loanRead`; effective conditions reviewed from handler/service |

```http
GET /api/loans/id-demo/schedule HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/loans/{id}/statement

**View or export a loan statement** · Repayments

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | Optional query: from/to (YYYY-MM-DD), type (DISBURSEMENT or PAYMENT), query (receipt reference search, 100 characters), page (1–100000; default 1). Omit format for JSON; use format=pdf or csv for export. format=json is invalid. JSON page size is 20; export limit 5,000 matching rows. |
| Success response | 200 LoanStatement with rows, schedule, totals, member/loan details plus total, page, pageSize; or private, no-store CSV/PDF attachment. PDF includes the complete current schedule. |
| Conditions | Member: own loan; staff: any loan. Opening scheduled debt contains all contractual principal and interest; filtered-out earlier rows still contribute to running balances. |
| Effects and audit | JSON reads have no success audit. Downloads and failed export attempts reaching the handler use EXPORT LoanStatement audits. |
| Errors | 400 invalid filters/format or export exceeds limit; 404 missing or unowned loan; shared 401/403/500/503 errors. |
| Screen | `/dashboard/loans/{id}` |
| Source | [`app/api/loans/[id]/statement/route.ts`](../../app/api/loans/%5Bid%5D/statement/route.ts) |
| Extracted guard | `custom`; effective conditions reviewed from handler/service |

**Validation expression(s), extracted from the handler:**

```ts
z.enum(["pdf", "csv"])

statementFiltersSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
GET /api/loans/loan-demo/statement?type=PAYMENT&page=1 HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/members

**List member records** · Membership

| Contract | Details |
| --- | --- |
| Authentication | Session · Administrator |
| Request | No request body. |
| Success response | 200 array of member profiles, with selected linked user fields and savings account; no API pagination. Table search is performed in the browser. |
| Conditions | Sign in and complete any required password change. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 401 unauthenticated; 403 access denied or password change required; 500 unexpected error; 503 database busy where reported by the common handler. |
| Screen | `/dashboard/admin/members` |
| Source | [`app/api/members/route.ts`](../../app/api/members/route.ts) |
| Extracted guard | `withRouteAuth`; literal roles: ADMIN |

```http
GET /api/members HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/members/{id}

**View a member profile** · Membership

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | No request body. |
| Success response | 200 member profile with selected linked user information and savings account. |
| Conditions | Member: own member ID. Treasurer, Board and Administrator: any member ID. Staff API access does not imply an administration menu. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 403 another member's record; 404 NOT_FOUND; shared 401/403/500/503 errors. |
| Screen | `/dashboard/admin/members/{id}`, `/dashboard/client/profile` |
| Source | [`app/api/members/[id]/route.ts`](../../app/api/members/%5Bid%5D/route.ts) |
| Extracted guard | `withRouteAuth`; effective conditions reviewed from handler/service |

```http
GET /api/members/id-demo HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/members/{id}/transactions

**View or export a savings ledger** · Savings

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | Optional query: query (80 characters), type (TransactionType), from/to (date strings), page (integer ≥1; default 1), pageSize (1–100; default 8), format (json default, csv, pdf). Savings date boundaries use the server's local Date operations; do not assume the dedicated Kampala calendar logic used by repayments and dividends. |
| Success response | 200 JSON { member, summary, transactions, pagination: { page, pageSize, totalCount, totalPages } }; or downloadable text/csv or application/pdf. Exports use all matching rows, ignoring page limits. |
| Conditions | Member: own ledger. Treasurer, Board, Administrator: any member ledger. |
| Effects and audit | Reads savings records. This savings export handler currently does not write an EXPORT audit; loan exports do. |
| Errors | 400 invalid query; 403 ownership; 404 NOT_FOUND; shared 401/500/503 errors. |
| Screen | `/dashboard/client`, `/dashboard/treasurer/members/{memberId}` |
| Source | [`app/api/members/[id]/transactions/route.ts`](../../app/api/members/%5Bid%5D/transactions/route.ts) |
| Extracted guard | `withRouteAuth`; literal roles: CLIENT, TREASURER, BOARD, ADMIN |

**Validation expression(s), extracted from the handler:**

```ts
savingsLedgerQuerySchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
GET /api/members/member-demo/transactions?format=json&page=1&pageSize=8 HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /api/withdrawal-requests

**List withdrawal requests** · Savings

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | Optional query: status (WithdrawalRequestStatus) and memberId. Members are always restricted to their own memberId; another ID is forbidden. |
| Success response | 200 array of up to 100 WithdrawalRequestRecord: id, amount, payoutMethod, payoutDetails, reason, status (PENDING, APPROVED, REJECTED, CANCELLED, DISBURSED), requestedAt, reviewedAt/reviewedBy/reviewComment, disbursedAt/disbursedBy, transactionReference, cancelledAt and member { id, memberNumber, name, accountNumber, balance }. Decimal values are strings. Newest first. |
| Conditions | Member: own requests. Treasurer, Board and Administrator: all requests. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 401 unauthenticated; 403 access denied or password change required; 500 unexpected error; 503 database busy where reported by the common handler. |
| Screen | `/dashboard/client`, `/dashboard/treasurer` |
| Source | [`app/api/withdrawal-requests/route.ts`](../../app/api/withdrawal-requests/route.ts) |
| Extracted guard | `loanRead`; effective conditions reviewed from handler/service |

**Validation expression(s), extracted from the handler:**

```ts
querySchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
GET /api/withdrawal-requests?status=PENDING HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
```

## GET /handbook

**Open the application handbook** · Operations

| Contract | Details |
| --- | --- |
| Authentication | public |
| Request | No request body. |
| Success response | 200 text/html: the built docs/index.html served as a standalone document (no app layout or styles); Cache-Control: no-cache. 404 text/plain when the handbook has not been built. |
| Conditions | No session required: the path is outside the session proxy. The handbook follows the shared light/dark theme preference. |
| Effects and audit | Reads records; no business mutation or read audit is performed by this handler. |
| Errors | 404 handbook not built. |
| Screen | API/framework operation; no dedicated application action button |
| Source | [`app/handbook/route.ts`](../../app/handbook/route.ts) |
| Extracted guard | `custom`; effective conditions reviewed from handler/service |

```http
GET /handbook HTTP/1.1
Host: localhost:3000
```

## PATCH /api/earnings-settings

**Set the member earnings share** · Earnings

| Contract | Details |
| --- | --- |
| Authentication | Session · Administrator |
| Request | JSON: memberSharePercent (0–100, up to 2 decimals). |
| Success response | 200 { memberSharePercent }. |
| Conditions | Administrator. Applies to runs calculated afterwards; existing proposals keep their frozen share. |
| Effects and audit | Saves SystemSetting MEMBER_EARNINGS_SHARE_PERCENT; UPDATE audit. |
| Errors | 401 unauthenticated; 403 access denied or password change required; 500 unexpected error; 503 database busy where reported by the common handler. |
| Screen | `/dashboard/earnings` |
| Source | [`app/api/earnings-settings/route.ts`](../../app/api/earnings-settings/route.ts) |
| Extracted guard | `loanMutation`; literal roles: ADMIN |

**Validation expression(s), extracted from the handler:**

```ts
earningsSettingsSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
PATCH /api/earnings-settings HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "memberSharePercent": "70"
}
```

## PATCH /api/investment-products/{id}

**Edit or deactivate an investment product** · Investments

| Contract | Details |
| --- | --- |
| Authentication | Session · Administrator |
| Request | JSON: name (2–100 characters), description (3–2000), expectedReturnRate (annual percentage string, 0–100, up to 4 decimals), riskProfile (LOW, MEDIUM, HIGH), active (boolean; default true). Unknown keys are rejected. PATCH uses the complete payload. |
| Success response | 200 saved product. |
| Conditions | Administrator; product name must be unique. Existing investments retain their snapshotted product terms. |
| Effects and audit | UPDATE InvestmentProduct audit; saves product. |
| Errors | 400 validation failure; 404 missing product on PATCH; 409 duplicate product name; shared mutation errors. |
| Screen | `/dashboard/investments` |
| Source | [`app/api/investment-products/[id]/route.ts`](../../app/api/investment-products/%5Bid%5D/route.ts) |
| Extracted guard | `loanMutation`; literal roles: ADMIN |

**Validation expression(s), extracted from the handler:**

```ts
productSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
PATCH /api/investment-products/id-demo HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "name": "Example fixed investment",
  "description": "Illustrative external investment record",
  "expectedReturnRate": "8",
  "riskProfile": "LOW",
  "active": true
}
```

## PATCH /api/investments/{id}

**Mark an investment matured or cancelled** · Investments

| Contract | Details |
| --- | --- |
| Authentication | Session · Administrator |
| Request | JSON: status (MATURED or CANCELLED). Unknown keys rejected. |
| Success response | 200 updated investment record. |
| Conditions | Administrator; holding must still be ACTIVE. MATURED requires maturity date reached in Kampala; CANCELLED closes an active record. |
| Effects and audit | Updates status; UPDATE MemberInvestment audit. Does not credit savings or investment proceeds. |
| Errors | 404 missing holding; 409 already closed or maturity not reached; shared mutation errors. |
| Screen | `/dashboard/investments` |
| Source | [`app/api/investments/[id]/route.ts`](../../app/api/investments/%5Bid%5D/route.ts) |
| Extracted guard | `loanMutation`; literal roles: ADMIN |

**Validation expression(s), extracted from the handler:**

```ts
investmentStatusSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
PATCH /api/investments/id-demo HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "status": "MATURED"
}
```

## PATCH /api/loan-settings

**Set the Board approval threshold** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Administrator |
| Request | JSON: threshold (positive decimal string, up to 12 integer digits and 2 decimals). |
| Success response | 200 { threshold: decimal string }. |
| Conditions | Administrator. Amounts at or above the threshold require a Board step. Applies to new applications only. |
| Effects and audit | Saves SystemSetting; UPDATE audit. |
| Errors | 401 unauthenticated; 403 access denied or password change required; 500 unexpected error; 503 database busy where reported by the common handler. |
| Screen | `/dashboard/admin/loan-types` |
| Source | [`app/api/loan-settings/route.ts`](../../app/api/loan-settings/route.ts) |
| Extracted guard | `loanMutation`; literal roles: ADMIN |

**Validation expression(s), extracted from the handler:**

```ts
thresholdSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
PATCH /api/loan-settings HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "threshold": "1000000.00"
}
```

## PATCH /api/loan-types/{id}

**Edit or deactivate a loan product** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Administrator |
| Request | JSON: name (2–100 characters), interestMethod (FLAT or REDUCING_BALANCE), interestRate (annual percentage string, 0–100, up to 4 decimals), maxTermMonths (integer 1–360), maxMultipleOfSavings (positive decimal string, up to 2 decimals), processingFeePercent (percentage string, less than 100), active (boolean; defaults true). PATCH requires the complete product payload, too. |
| Success response | 200 saved loan type. |
| Conditions | Administrator; unique product name. Edit/deactivation affects future applications; submitted applications retain their terms. |
| Effects and audit | UPDATE LoanType audit and product persistence. |
| Errors | 400 validation failure; 404 missing product on PATCH; 409 duplicate product name; shared 401/403/500/503 errors. |
| Screen | `/dashboard/admin/loan-types` |
| Source | [`app/api/loan-types/[id]/route.ts`](../../app/api/loan-types/%5Bid%5D/route.ts) |
| Extracted guard | `loanMutation`; literal roles: ADMIN |

**Validation expression(s), extracted from the handler:**

```ts
loanTypeSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
PATCH /api/loan-types/id-demo HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "name": "Example development loan",
  "interestMethod": "REDUCING_BALANCE",
  "interestRate": "12",
  "maxTermMonths": 12,
  "maxMultipleOfSavings": "3",
  "processingFeePercent": "2",
  "active": true
}
```

## PATCH /api/members/{id}

**Update a member profile or role** · Membership

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Administrator |
| Request | JSON: optional address, phone, email, nextOfKinName, nextOfKinPhone for Members. Administrator may also send firstName, lastName, username, nationalIdNumber, dateOfBirth, photoUrl, status (PENDING, ACTIVE, SUSPENDED, EXITED), role (CLIENT, TREASURER, BOARD, ADMIN). See validation reference for individual field rules. |
| Success response | 200 updated member profile; refresh the page after role changes because the response's included user relation is read before the linked user update. |
| Conditions | Member: own record and contact fields. Administrator: any member; cannot change their own system role. Membership status is separate from login and savings-account status. |
| Effects and audit | Updates profile and linked login identifiers/role together; UPDATE Member audit. Existing JWT role claims refresh on a new sign-in. |
| Errors | 400 SELF_ROLE_CHANGE_FORBIDDEN or validation failure; 403 disallowed role/ownership; 404 NOT_FOUND; 409 IDENTIFIER_TAKEN; shared 401/500/503 errors. |
| Screen | `/dashboard/admin/members/{id}`, `/dashboard/client/profile` |
| Source | [`app/api/members/[id]/route.ts`](../../app/api/members/%5Bid%5D/route.ts) |
| Extracted guard | `withRouteAuth`; effective conditions reviewed from handler/service |

**Validation expression(s), extracted from the handler:**

```ts
selfMemberUpdateSchema

adminMemberUpdateSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
PATCH /api/members/id-demo HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "address": "Updated example address",
  "phone": "+256700000123"
}
```

## POST /api/auth/{...nextauth}

**Sign in or sign out** · Access

| Contract | Details |
| --- | --- |
| Authentication | framework |
| Request | NextAuth catch-all handler. The application uses the Credentials provider with identifier and password, plus NextAuth session cookies and CSRF handling. Use the signIn/signOut client helpers. GET includes session, csrf, providers and sign-in resources; POST includes callback/credentials and signout. See API conventions for the delegated-handler boundary. |
| Success response | NextAuth-managed JSON, HTML or redirect depending on the subpath, request and session state; this is not the application's ordinary JSON error contract. |
| Conditions | Credentials must match an ACTIVE login account. Identifier may be a member number, username, phone or email. Sign-out uses the current session. |
| Effects and audit | Successful sign-in updates lastLoginAt and writes LOGIN; rejected credentials write LOGIN_FAILED. Sign-out writes LOGOUT when a token user exists. |
| Errors | Framework-managed authentication and CSRF errors; invalid credentials are surfaced by the sign-in form. |
| Screen | `/sign-in` |
| Source | [`app/api/auth/[...nextauth]/route.ts`](../../app/api/auth/%5B...nextauth%5D/route.ts) |
| Extracted guard | `delegated`; effective conditions reviewed from handler/service |

Use the application's NextAuth signIn/signOut helpers; see API conventions.

## POST /api/auth/change-password

**Change your password** · Access

| Contract | Details |
| --- | --- |
| Authentication | Session · Member, Treasurer, Board, Administrator |
| Request | JSON: currentPassword (nonempty), newPassword (at least 10 characters including lowercase, uppercase, a digit and a symbol). This authenticated route permits users who must change their temporary password. |
| Success response | 200 { success: true }. |
| Conditions | Current password must match. Applies to the signed-in user only. |
| Effects and audit | Replaces password hash, clears mustChangePassword and temporary-credential timestamp, consumes all outstanding reset requests. PASSWORD_CHANGE audit. |
| Errors | 400 WEAK_PASSWORD or CURRENT_PASSWORD_INVALID; 401 unauthenticated; 404 NOT_FOUND; shared 500/503 errors. |
| Screen | `/change-password` |
| Source | [`app/api/auth/change-password/route.ts`](../../app/api/auth/change-password/route.ts) |
| Extracted guard | `withRouteAuth`; effective conditions reviewed from handler/service |

**Validation expression(s), extracted from the handler:**

```ts
changePasswordSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/auth/change-password HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "currentPassword": "<current-password>",
  "newPassword": "<new-strong-password>"
}
```

## POST /api/auth/reset-password

**Request password recovery** · Access

| Contract | Details |
| --- | --- |
| Authentication | public |
| Request | JSON: identifier (nonempty member number, username, phone or email). |
| Success response | 200 { channel: EMAIL \| SMS \| ADMIN_ASSISTED \| null, previewToken: string \| null }. |
| Conditions | No session required. Email is preferred when present, otherwise phone, otherwise administrator assistance. An unmatched identifier returns null fields. |
| Effects and audit | Creates a hashed reset token valid for 15 minutes and a stored notification when possible; PASSWORD_RESET audit. The pilot returns the raw previewToken to the form; email/SMS sending is not implemented. |
| Errors | 400 validation failure; shared 500/503 errors. |
| Screen | `/forgot-password` |
| Source | [`app/api/auth/reset-password/route.ts`](../../app/api/auth/reset-password/route.ts) |
| Extracted guard | `custom`; effective conditions reviewed from handler/service |

**Validation expression(s), extracted from the handler:**

```ts
passwordResetRequestSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/auth/reset-password HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "identifier": "HLUSCA-000123"
}
```

## POST /api/auth/reset-password/confirm

**Complete password recovery** · Access

| Contract | Details |
| --- | --- |
| Authentication | public |
| Request | JSON: identifier (nonempty), token (at least 6 characters), newPassword (same complexity rules as password change). |
| Success response | 200 { success: true }. |
| Conditions | No session required; token must match an unconsumed, unexpired request for the resolved user. |
| Effects and audit | Updates password hash, clears first-login flags, consumes the matching reset request; PASSWORD_CHANGE audit. User signs in afterward. |
| Errors | 400 INVALID_RESET_REQUEST, TOKEN_INVALID, WEAK_PASSWORD or validation failure; shared 500/503 errors. |
| Screen | `/forgot-password` |
| Source | [`app/api/auth/reset-password/confirm/route.ts`](../../app/api/auth/reset-password/confirm/route.ts) |
| Extracted guard | `custom`; effective conditions reviewed from handler/service |

**Validation expression(s), extracted from the handler:**

```ts
passwordResetConfirmSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/auth/reset-password/confirm HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "identifier": "HLUSCA-000123",
  "token": "<reset-token>",
  "newPassword": "<new-strong-password>"
}
```

## POST /api/contracts/{id}/sign

**Sign a loan agreement** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Member |
| Request | JSON: typedName (3–200 characters, matching the contract's member name), signature (data:image/png;base64,…; up to 350000 characters), documentHash (64 lowercase hexadecimal characters), agree: true. PNG is validated for format, size, dimensions and nonblank ink. |
| Success response | 200 signed contract metadata. |
| Conditions | Member owns the contract and is active; contract awaits signature; submitted hash matches retained PDF. UI requires a review and final confirmation. |
| Effects and audit | Retains PNG/hash, typed name, consent version, PDF hash, timestamp, IP and user agent; marks SIGNED; SIGN audit. Database trigger protects the original agreement and signed evidence. |
| Errors | 400 name/signature/consent validation; 403 ownership or inactive member; 404 missing contract; 409 state/hash conflict; shared mutation errors. |
| Screen | `/dashboard/loans/{id}` |
| Source | [`app/api/contracts/[id]/sign/route.ts`](../../app/api/contracts/%5Bid%5D/sign/route.ts) |
| Extracted guard | `loanMutation`; literal roles: CLIENT |

**Validation expression(s), extracted from the handler:**

```ts
signatureSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/contracts/id-demo/sign HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "typedName": "Demo Member",
  "signature": "data:image/png;base64,<valid-signature-PNG>",
  "documentHash": "<64-character-document-hash>",
  "agree": true
}
```

## POST /api/dividend-runs

**Calculate a dividend proposal** · Dividends

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer |
| Request | JSON: financialYear (integer 2000–9998 matching ending year), periodStart and periodEnd (YYYY-MM-DD inclusive; one completed 12-month year of 365/366 days), totalPoolAmount (positive decimal string). Unknown keys rejected. |
| Success response | 200 PROPOSED dividend run with frozen calculationSnapshot allocations. |
| Conditions | Treasurer; period must have ended; no overlapping non-REJECTED run; at least one eligible positive-weight member. Active members and active accounts opened before year end with positive average daily savings qualify. |
| Effects and audit | Computes daily closing savings in Africa/Kampala with exact balance-day weights and largest-remainder cent distribution. Saves proposal and CREATE DividendRun audit. Does not credit savings yet. |
| Errors | 400 invalid/incomplete/uncompleted year; 409 overlapping run, no eligible members or inconsistent savings history; shared mutation errors. |
| Screen | `/dashboard/dividends` |
| Source | [`app/api/dividend-runs/route.ts`](../../app/api/dividend-runs/route.ts) |
| Extracted guard | `loanMutation`; literal roles: TREASURER |

**Validation expression(s), extracted from the handler:**

```ts
dividendRunSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/dividend-runs HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "financialYear": 2025,
  "periodStart": "2025-01-01",
  "periodEnd": "2025-12-31",
  "totalPoolAmount": "1000000.00"
}
```

## POST /api/dividend-runs/{id}/approve

**Approve a dividend proposal** · Dividends

| Contract | Details |
| --- | --- |
| Authentication | Session · Board |
| Request | JSON: comment (3–2000 characters); optional decision must equal APPROVED and defaults to that value. Unknown keys rejected. |
| Success response | 200 updated dividend run. |
| Conditions | Board; run must be PROPOSED. Its creator cannot review it, even after a role change. |
| Effects and audit | Stores decision, reviewer, comment and timestamp; APPROVE DividendRun audit. Allocations remain frozen for Treasurer posting. |
| Errors | 403 creator reviewing own proposal; 404 missing run; 409 already decided; shared mutation errors. |
| Screen | `/dashboard/dividends` |
| Source | [`app/api/dividend-runs/[id]/approve/route.ts`](../../app/api/dividend-runs/%5Bid%5D/approve/route.ts) |
| Extracted guard | `loanMutation`; literal roles: BOARD |

**Validation expression(s), extracted from the handler:**

```ts
dividendDecisionSchema
    .omit({ decision: true })
    .extend({ decision: z.literal("APPROVED").default("APPROVED") })
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/dividend-runs/id-demo/approve HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "comment": "Example Board review recorded"
}
```

## POST /api/dividend-runs/{id}/post

**Post approved dividends to savings** · Dividends

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer |
| Request | JSON: password (Treasurer's current password, 1–200 characters), confirm: true. Unknown keys rejected. |
| Success response | 200 posted dividend run. |
| Conditions | Treasurer; valid password; APPROVED and not yet posted; approver cannot post the same run. Rechecks every recipient's member/account status and saved allocation integrity. |
| Effects and audit | Creates DividendAllocation history and positive DIVIDEND savings credits, updates balances and POSTED status, stores DISBURSE DividendRun audit atomically. Zero shares remain in history without zero ledger entries. Repeat/concurrent calls cannot pay twice. |
| Errors | 403 password/actor or approver posting own approved run; 404 missing run; 409 nonapproved/already-posted run, inactive recipients or allocation integrity conflict; shared mutation errors. |
| Screen | `/dashboard/dividends` |
| Source | [`app/api/dividend-runs/[id]/post/route.ts`](../../app/api/dividend-runs/%5Bid%5D/post/route.ts) |
| Extracted guard | `loanMutation`; literal roles: TREASURER |

**Validation expression(s), extracted from the handler:**

```ts
dividendPostSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/dividend-runs/id-demo/post HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "password": "<treasurer-password>",
  "confirm": true
}
```

## POST /api/dividend-runs/{id}/reject

**Reject a dividend proposal** · Dividends

| Contract | Details |
| --- | --- |
| Authentication | Session · Board |
| Request | JSON: comment (3–2000 characters); optional decision must equal REJECTED and defaults to that value. Unknown keys rejected. |
| Success response | 200 updated dividend run. |
| Conditions | Board; run must be PROPOSED. Its creator cannot review it, even after a role change. |
| Effects and audit | Stores decision, reviewer, comment and timestamp; REJECT DividendRun audit. A new proposal can replace the rejected period. |
| Errors | 403 creator reviewing own proposal; 404 missing run; 409 already decided; shared mutation errors. |
| Screen | `/dashboard/dividends` |
| Source | [`app/api/dividend-runs/[id]/reject/route.ts`](../../app/api/dividend-runs/%5Bid%5D/reject/route.ts) |
| Extracted guard | `loanMutation`; literal roles: BOARD |

**Validation expression(s), extracted from the handler:**

```ts
dividendDecisionSchema
    .omit({ decision: true })
    .extend({ decision: z.literal("REJECTED").default("REJECTED") })
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/dividend-runs/id-demo/reject HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "comment": "Example Board review recorded"
}
```

## POST /api/earnings-runs

**Calculate a month's member earnings** · Earnings

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer |
| Request | JSON: month (YYYY-MM). Unknown keys rejected. |
| Success response | 200 PROPOSED earnings run with frozen member shares. |
| Conditions | Treasurer; month must have ended (Kampala); no other PROPOSED run; month later than the latest POSTED month; at least some newly collected interest. Interest collected (LoanSchedule.interestPaid) not yet shared by a POSTED run, capped at interest accrued through the month end. Each installment's interest is spread evenly from the previous due date to its due date; new interest funds the earliest unfunded days. Each day's slice is split by every savings account's lowest balance during that Kampala day. |
| Effects and audit | Freezes the member share setting, per-member amounts (largest-remainder cents) and per-loan recognized interest; CREATE EarningsRun audit. Does not credit savings yet. |
| Errors | 400 invalid month or month not completed; 409 open proposal, later month already posted, nothing newly collected or invalid share setting; shared mutation errors. |
| Screen | `/dashboard/earnings` |
| Source | [`app/api/earnings-runs/route.ts`](../../app/api/earnings-runs/route.ts) |
| Extracted guard | `loanMutation`; literal roles: TREASURER |

**Validation expression(s), extracted from the handler:**

```ts
earningsRunSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/earnings-runs HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "month": "2026-03"
}
```

## POST /api/earnings-runs/{id}/cancel

**Cancel an earnings proposal** · Earnings

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer |
| Request | JSON object {} is required by the mutation wrapper. |
| Success response | 200 cancelled earnings run. |
| Conditions | Treasurer; run must be PROPOSED. |
| Effects and audit | Marks CANCELLED; its recognized interest is released for a new calculation. UPDATE EarningsRun audit. |
| Errors | 404 missing run; 409 not an open proposal; shared mutation errors. |
| Screen | `/dashboard/earnings` |
| Source | [`app/api/earnings-runs/[id]/cancel/route.ts`](../../app/api/earnings-runs/%5Bid%5D/cancel/route.ts) |
| Extracted guard | `loanMutation`; literal roles: TREASURER |

**Validation expression(s), extracted from the handler:**

```ts
earningsCancelSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/earnings-runs/id-demo/cancel HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{}
```

## POST /api/earnings-runs/{id}/post

**Post member earnings to savings** · Earnings

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer |
| Request | JSON: password (Treasurer's current password, 1–200 characters), confirm: true. Unknown keys rejected. |
| Success response | 200 posted earnings run. |
| Conditions | Treasurer; valid password (five failures in ten minutes pause attempts); run PROPOSED and no later month posted; frozen shares must still total the member pool. |
| Effects and audit | Credits INTEREST transactions (reference ERN-YYYY-MM) to ACTIVE savings accounts, records EarningsAllocation rows, retains shares of inactive accounts as forfeitedAmount, notifies credited members and marks POSTED with DISBURSE EarningsRun audit atomically. Repeat/concurrent calls cannot pay twice. |
| Errors | 403 incorrect password; 404 missing run; 409 already posted/cancelled, later month posted or inconsistent proposal; 429 too many failed attempts; shared mutation errors. |
| Screen | `/dashboard/earnings` |
| Source | [`app/api/earnings-runs/[id]/post/route.ts`](../../app/api/earnings-runs/%5Bid%5D/post/route.ts) |
| Extracted guard | `loanMutation`; literal roles: TREASURER |

**Validation expression(s), extracted from the handler:**

```ts
earningsPostSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/earnings-runs/id-demo/post HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "password": "<treasurer-password>",
  "confirm": true
}
```

## POST /api/investment-products

**Create an investment product** · Investments

| Contract | Details |
| --- | --- |
| Authentication | Session · Administrator |
| Request | JSON: name (2–100 characters), description (3–2000), expectedReturnRate (annual percentage string, 0–100, up to 4 decimals), riskProfile (LOW, MEDIUM, HIGH), active (boolean; default true). Unknown keys are rejected. PATCH uses the complete payload. |
| Success response | 200 saved product. |
| Conditions | Administrator; product name must be unique. Existing investments retain their snapshotted product terms. |
| Effects and audit | CREATE InvestmentProduct audit; saves product. |
| Errors | 400 validation failure; 404 missing product on PATCH; 409 duplicate product name; shared mutation errors. |
| Screen | `/dashboard/investments` |
| Source | [`app/api/investment-products/route.ts`](../../app/api/investment-products/route.ts) |
| Extracted guard | `loanMutation`; literal roles: ADMIN |

**Validation expression(s), extracted from the handler:**

```ts
productSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/investment-products HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "name": "Example fixed investment",
  "description": "Illustrative external investment record",
  "expectedReturnRate": "8",
  "riskProfile": "LOW",
  "active": true
}
```

## POST /api/investments

**Record an externally funded investment** · Investments

| Contract | Details |
| --- | --- |
| Authentication | Session · Administrator |
| Request | JSON: memberId and investmentProductId (1–100 characters), principal (positive decimal string), startDate and maturityDate (YYYY-MM-DD). Unknown keys rejected. |
| Success response | 200 saved investment record with member information. |
| Conditions | Administrator; ACTIVE member and active product; start not in future; maturity after start. |
| Effects and audit | Creates ACTIVE holding and snapshots product name, rate and risk; CREATE MemberInvestment audit. Does not debit savings, transfer money, or automatically pay returns. |
| Errors | 400 invalid dates/payload; 409 inactive product/member; shared mutation errors. |
| Screen | `/dashboard/investments` |
| Source | [`app/api/investments/route.ts`](../../app/api/investments/route.ts) |
| Extracted guard | `loanMutation`; literal roles: ADMIN |

**Validation expression(s), extracted from the handler:**

```ts
investmentSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/investments HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "memberId": "member-demo",
  "investmentProductId": "product-demo",
  "principal": "500000.00",
  "startDate": "2026-09-01",
  "maturityDate": "2027-09-01"
}
```

## POST /api/loan-applications

**Apply for a loan** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Member |
| Request | JSON: loanTypeId (1–100 characters), amountRequested (positive decimal string), termMonths (integer 1–360), purpose (10–2000 characters). |
| Success response | 200 ApplicationRecord including member, approvalSteps, contract and loan relations (the latter are initially null). |
| Conditions | Member's own active membership and active savings account; active product, term within product limit, requested amount ≤ current savings × product multiple, positive net disbursement. |
| Effects and audit | Creates SUBMITTED application and ordered approval steps; snapshots product terms and approval threshold. CREATE LoanApplication audit. |
| Errors | 400 validation/eligibility failure; 403 missing membership; 404 unavailable product; shared 401/403/500/503 errors. |
| Screen | `/dashboard/loans/apply` |
| Source | [`app/api/loan-applications/route.ts`](../../app/api/loan-applications/route.ts) |
| Extracted guard | `loanMutation`; literal roles: CLIENT |

**Validation expression(s), extracted from the handler:**

```ts
applicationSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/loan-applications HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "loanTypeId": "product-demo",
  "amountRequested": "300000.00",
  "termMonths": 12,
  "purpose": "Example school fees application"
}
```

## POST /api/loan-applications/{id}/approve

**Approve a loan application** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer, Board |
| Request | JSON: optional comment (up to 2000 characters; defaults empty). |
| Success response | 200 updated ApplicationRecord. |
| Conditions | The application must be SUBMITTED or UNDER_REVIEW and awaiting this role's next approval step. Treasurer reviews first. Amounts equal to or above the frozen threshold also require Board approval. You cannot review your own application or complete another step after already reviewing it under a different role. |
| Effects and audit | Updates approval step and UNDER_REVIEW/APPROVED state. Final approval creates the contract automatically. Stores member notification and APPROVE audit. |
| Errors | 400 invalid comment; 403 own application, wrong review stage or repeated reviewer; 404 missing application; 409 already decided; shared 401/500/503 errors. |
| Screen | `/dashboard/loans/{id}` |
| Source | [`app/api/loan-applications/[id]/approve/route.ts`](../../app/api/loan-applications/%5Bid%5D/approve/route.ts) |
| Extracted guard | `loanMutation`; literal roles: TREASURER, BOARD |

**Validation expression(s), extracted from the handler:**

```ts
decisionSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/loan-applications/id-demo/approve HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "comment": "Example review completed"
}
```

## POST /api/loan-applications/{id}/contract

**Ensure an approved application has a contract** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer, Board |
| Request | JSON object {} is required by the mutation wrapper. |
| Success response | 200 contract metadata. |
| Conditions | Treasurer or Board; application must be APPROVED. Existing contract is reused; signed evidence is not regenerated. The UI relies on automatic creation at final approval and does not expose a separate generate button. |
| Effects and audit | Creates the retained agreement if absent; CREATE LoanContract audit. |
| Errors | 404 missing application; 409 application not approved; shared mutation errors (see API conventions). |
| Screen | API/framework operation; no dedicated application action button |
| Source | [`app/api/loan-applications/[id]/contract/route.ts`](../../app/api/loan-applications/%5Bid%5D/contract/route.ts) |
| Extracted guard | `loanMutation`; literal roles: TREASURER, BOARD |

**Validation expression(s), extracted from the handler:**

```ts
z.object({})
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/loan-applications/id-demo/contract HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{}
```

## POST /api/loan-applications/{id}/disburse

**Disburse an approved and signed loan** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer |
| Request | JSON: password (Treasurer's current password, 1–200 characters), confirm: true. id is the application ID; no Loan exists until this action succeeds. |
| Success response | 200 serialized Loan scalar record including id, loanApplicationId, memberId, contractId, principal, rates, fees, netDisbursement, disbursementDate, outstandingBalance and status. Fetch schedule or application details separately for related records. |
| Conditions | Treasurer; own-loan disbursement forbidden; approved and signed, not already disbursed; PDF integrity, active member/account and current savings eligibility rechecked. |
| Effects and audit | Creates Loan and monthly schedule; credits net principal after fee to savings; stores notification and DISBURSE audit atomically. Full principal plus scheduled interest remains repayable. |
| Errors | 403 incorrect password, own loan or invalid actor; 404 missing application; 409 duplicate, state, integrity, account or eligibility conflict; shared mutation errors. |
| Screen | `/dashboard/loans/{id}` |
| Source | [`app/api/loan-applications/[id]/disburse/route.ts`](../../app/api/loan-applications/%5Bid%5D/disburse/route.ts) |
| Extracted guard | `loanMutation`; literal roles: TREASURER |

**Validation expression(s), extracted from the handler:**

```ts
disbursementSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/loan-applications/id-demo/disburse HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "password": "<treasurer-password>",
  "confirm": true
}
```

## POST /api/loan-applications/{id}/reject

**Reject a loan application** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer, Board |
| Request | JSON: comment (required, 3–2000 characters). |
| Success response | 200 updated ApplicationRecord. |
| Conditions | The application must be SUBMITTED or UNDER_REVIEW and awaiting this role's next approval step. Treasurer reviews first. Amounts equal to or above the frozen threshold also require Board approval. You cannot review your own application or complete another step after already reviewing it under a different role. |
| Effects and audit | Updates current approval step and REJECTED state, saves rejection reason and member notification; REJECT audit. |
| Errors | 400 invalid comment; 403 own application, wrong review stage or repeated reviewer; 404 missing application; 409 already decided; shared 401/500/503 errors. |
| Screen | `/dashboard/loans/{id}` |
| Source | [`app/api/loan-applications/[id]/reject/route.ts`](../../app/api/loan-applications/%5Bid%5D/reject/route.ts) |
| Extracted guard | `loanMutation`; literal roles: TREASURER, BOARD |

**Validation expression(s), extracted from the handler:**

```ts
rejectionSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/loan-applications/id-demo/reject HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "comment": "Example: supporting purpose needs clarification"
}
```

## POST /api/loan-types

**Create a loan product** · Loans

| Contract | Details |
| --- | --- |
| Authentication | Session · Administrator |
| Request | JSON: name (2–100 characters), interestMethod (FLAT or REDUCING_BALANCE), interestRate (annual percentage string, 0–100, up to 4 decimals), maxTermMonths (integer 1–360), maxMultipleOfSavings (positive decimal string, up to 2 decimals), processingFeePercent (percentage string, less than 100), active (boolean; defaults true). PATCH requires the complete product payload, too. |
| Success response | 200 saved loan type. |
| Conditions | Administrator; unique product name. Edit/deactivation affects future applications; submitted applications retain their terms. |
| Effects and audit | CREATE LoanType audit and product persistence. |
| Errors | 400 validation failure; 404 missing product on PATCH; 409 duplicate product name; shared 401/403/500/503 errors. |
| Screen | `/dashboard/admin/loan-types` |
| Source | [`app/api/loan-types/route.ts`](../../app/api/loan-types/route.ts) |
| Extracted guard | `loanMutation`; literal roles: ADMIN |

**Validation expression(s), extracted from the handler:**

```ts
loanTypeSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/loan-types HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "name": "Example development loan",
  "interestMethod": "REDUCING_BALANCE",
  "interestRate": "12",
  "maxTermMonths": 12,
  "maxMultipleOfSavings": "3",
  "processingFeePercent": "2",
  "active": true
}
```

## POST /api/loans/{id}/payments

**Record a loan repayment receipt** · Repayments

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer |
| Request | JSON: amount (positive decimal string), paymentDate (YYYY-MM-DD), method (CASH, BANK_TRANSFER, MOBILE_MONEY), reference (1–100 characters, letters/digits/spaces/dots/slashes/underscores/hyphens; begins with a letter or digit), optional targetInstallmentNumber (integer 1–360), confirm: true. Reference is trimmed and uppercased. |
| Success response | 200 { payment, outstandingBalance: decimal string, status: LoanStatus }. |
| Conditions | Treasurer; another Treasurer must record a Treasurer-member's own loan receipt. Loan not CLOSED, date between disbursement and today in Kampala, unique reference within loan, amount ≤ entire scheduled balance. Target installment must be valid. |
| Effects and audit | Stores immutable receipt, recomputes allocations chronologically, updates schedule counters and loan balance, closes fully paid loan, stores notification and CREATE LoanPayment audit. External receipts do not alter savings. Backdating may change earlier allocations. |
| Errors | 400 invalid date/target/reference or payload; 403 own loan; 404 missing loan; 409 closed loan, duplicate reference or excessive amount; shared mutation errors. |
| Screen | `/dashboard/loans/{id}` |
| Source | [`app/api/loans/[id]/payments/route.ts`](../../app/api/loans/%5Bid%5D/payments/route.ts) |
| Extracted guard | `loanMutation`; literal roles: TREASURER |

**Validation expression(s), extracted from the handler:**

```ts
paymentSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/loans/id-demo/payments HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "amount": "30000.00",
  "paymentDate": "2026-09-09",
  "method": "BANK_TRANSFER",
  "reference": "DEMO-RECEIPT-123",
  "confirm": true
}
```

## POST /api/members

**Enroll a member** · Membership

| Contract | Details |
| --- | --- |
| Authentication | Session · Administrator |
| Request | JSON: firstName and lastName (at least 2 characters), username (3–32 letters, digits, dots, underscores or hyphens), phone and nextOfKinPhone (international +country-code format), address and nextOfKinName (at least 2 characters), nationalIdNumber (at least 5 characters). Optional email, dateOfBirth and photoUrl. Username, phone and email must be unique across users. |
| Success response | 200 { member: profile including user and savingsAccount, temporaryPassword: string, deliveryMethod: string }. |
| Conditions | Administrator; unique identifiers. The created login is CLIENT/ACTIVE and membership is PENDING. |
| Effects and audit | Creates member number, member, login, zero-balance ACTIVE savings account and welcome notification in an audited transaction. Returns a temporary password for handover; CREATE Member audit. |
| Errors | 400 validation failure; 409 IDENTIFIER_TAKEN for an existing login identifier; shared 401/403/500/503 errors. |
| Screen | `/dashboard/admin/members/new` |
| Source | [`app/api/members/route.ts`](../../app/api/members/route.ts) |
| Extracted guard | `withRouteAuth`; literal roles: ADMIN |

**Validation expression(s), extracted from the handler:**

```ts
memberEnrollmentSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/members HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "firstName": "Demo",
  "lastName": "Member",
  "username": "demo.member",
  "phone": "+256700000123",
  "address": "Example address",
  "nationalIdNumber": "DEMO-000123",
  "nextOfKinName": "Demo Contact",
  "nextOfKinPhone": "+256700000124"
}
```

## POST /api/savings/{accountId}/deposit

**Record a savings deposit** · Savings

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer |
| Request | JSON: amount (positive string or number with at most 2 decimal places; prefer strings), optional reference (80 characters) and narrative (240 characters). accountId is the savings account ID, not the member ID. |
| Success response | 200 { memberId, memberNumber, balance: decimal string, transaction, activatedMember: boolean }. |
| Conditions | Treasurer; savings account must be ACTIVE. The handler does not forbid the Treasurer's own savings account. |
| Effects and audit | Locks account, adds balance and DEPOSIT transaction, activates a PENDING member on deposit; DEPOSIT audit in the same transaction. |
| Errors | 400 validation failure; 404 NOT_FOUND; 409 ACCOUNT_INACTIVE or INSUFFICIENT_BALANCE for withdrawal; shared 401/403/500/503 errors. |
| Screen | `/dashboard/treasurer`, `/dashboard/treasurer/members/{memberId}` |
| Source | [`app/api/savings/[accountId]/deposit/route.ts`](../../app/api/savings/%5BaccountId%5D/deposit/route.ts) |
| Extracted guard | `withRouteAuth`; literal roles: TREASURER |

**Validation expression(s), extracted from the handler:**

```ts
savingsMutationSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/savings/accountId-demo/deposit HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "amount": "50000.00",
  "reference": "DEMO-RECEIPT-123",
  "narrative": "Example savings entry"
}
```

## POST /api/savings/{accountId}/withdraw

**Record a savings withdrawal** · Savings

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer |
| Request | JSON: amount (positive string or number with at most 2 decimal places; prefer strings), optional reference (80 characters) and narrative (240 characters). accountId is the savings account ID, not the member ID. |
| Success response | 200 { memberId, memberNumber, balance: decimal string, transaction, activatedMember: boolean }. |
| Conditions | Treasurer; ACTIVE savings account and enough available balance. The handler does not forbid the Treasurer's own savings account. |
| Effects and audit | Locks account, subtracts balance and adds WITHDRAWAL transaction; WITHDRAW audit in the same transaction. |
| Errors | 400 validation failure; 404 NOT_FOUND; 409 ACCOUNT_INACTIVE or INSUFFICIENT_BALANCE for withdrawal; shared 401/403/500/503 errors. |
| Screen | `/dashboard/treasurer`, `/dashboard/treasurer/members/{memberId}` |
| Source | [`app/api/savings/[accountId]/withdraw/route.ts`](../../app/api/savings/%5BaccountId%5D/withdraw/route.ts) |
| Extracted guard | `withRouteAuth`; literal roles: TREASURER |

**Validation expression(s), extracted from the handler:**

```ts
savingsMutationSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/savings/accountId-demo/withdraw HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "amount": "50000.00",
  "reference": "DEMO-RECEIPT-123",
  "narrative": "Example savings entry"
}
```

## POST /api/withdrawal-requests

**Request a savings withdrawal** · Savings

| Contract | Details |
| --- | --- |
| Authentication | Session · Member |
| Request | JSON: amount (positive decimal string, up to 2 decimals), payoutMethod (CASH, BANK_TRANSFER, MOBILE_MONEY), payoutDetails (up to 120 characters; required unless CASH, ignored for CASH), optional reason (up to 240 characters). Unknown keys rejected. |
| Success response | 200 { id, status: PENDING }. |
| Conditions | Member; ACTIVE membership and savings account. Amount must not exceed the savings balance minus the member's other PENDING or APPROVED requests. |
| Effects and audit | Locks the member's account so concurrent requests cannot over-commit savings, then creates a PENDING request; CREATE WithdrawalRequest audit. The savings balance does not change until payout. |
| Errors | 400 validation failure; 403 non-Member or missing membership; 404 missing savings account; 409 inactive membership/account or INSUFFICIENT_BALANCE; shared mutation errors. |
| Screen | `/dashboard/client` |
| Source | [`app/api/withdrawal-requests/route.ts`](../../app/api/withdrawal-requests/route.ts) |
| Extracted guard | `loanMutation`; literal roles: CLIENT |

**Validation expression(s), extracted from the handler:**

```ts
withdrawalRequestSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/withdrawal-requests HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "amount": "50000.00",
  "payoutMethod": "MOBILE_MONEY",
  "payoutDetails": "+256700000123",
  "reason": "Example school fees"
}
```

## POST /api/withdrawal-requests/{id}/approve

**Approve a withdrawal request** · Savings

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer |
| Request | JSON: optional comment (up to 500 characters). |
| Success response | 200 { id, status: APPROVED }. |
| Conditions | Treasurer; request must be PENDING. The member's savings account must be ACTIVE and its balance must still cover the amount. Another Treasurer must handle a request from a Treasurer's own linked membership. |
| Effects and audit | Stores reviewer, timestamp and comment; member notification; APPROVE WithdrawalRequest audit. Savings are not debited until payout. |
| Errors | 400 invalid comment; 403 own request; 404 missing request; 409 already reviewed, inactive account or INSUFFICIENT_BALANCE; shared mutation errors. |
| Screen | `/dashboard/treasurer` |
| Source | [`app/api/withdrawal-requests/[id]/approve/route.ts`](../../app/api/withdrawal-requests/%5Bid%5D/approve/route.ts) |
| Extracted guard | `loanMutation`; literal roles: TREASURER |

**Validation expression(s), extracted from the handler:**

```ts
withdrawalApproveSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/withdrawal-requests/id-demo/approve HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "comment": "Example review completed"
}
```

## POST /api/withdrawal-requests/{id}/cancel

**Cancel your withdrawal request** · Savings

| Contract | Details |
| --- | --- |
| Authentication | Session · Member |
| Request | JSON object {} is required by the mutation wrapper. |
| Success response | 200 { id, status: CANCELLED }. |
| Conditions | Member; own request; status PENDING or APPROVED. |
| Effects and audit | Marks CANCELLED and releases the reserved amount; UPDATE WithdrawalRequest audit. |
| Errors | 404 missing or another member's request; 409 already closed; shared mutation errors. |
| Screen | `/dashboard/client` |
| Source | [`app/api/withdrawal-requests/[id]/cancel/route.ts`](../../app/api/withdrawal-requests/%5Bid%5D/cancel/route.ts) |
| Extracted guard | `loanMutation`; literal roles: CLIENT |

**Validation expression(s), extracted from the handler:**

```ts
withdrawalCancelSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/withdrawal-requests/id-demo/cancel HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{}
```

## POST /api/withdrawal-requests/{id}/disburse

**Pay out an approved withdrawal request** · Savings

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer |
| Request | JSON: password (Treasurer's current password, 1–200 characters), optional reference (payout transaction ID, up to 80 characters; defaults to WDR-{id}), confirm: true. Unknown keys rejected. |
| Success response | 200 { id, status: DISBURSED, balance: decimal string }. |
| Conditions | Treasurer; valid password; request must be APPROVED; savings account ACTIVE with enough balance at payout. Another Treasurer must handle a request from a Treasurer's own linked membership. Eight failed payout attempts in ten minutes pause further attempts. |
| Effects and audit | Locks request and account, subtracts balance, creates a WITHDRAWAL transaction, marks DISBURSED with a link to that transaction, stores member notification and WITHDRAW WithdrawalRequest audit atomically. Repeat/concurrent calls cannot pay twice. |
| Errors | 403 incorrect password or own request; 404 missing request; 409 not approved, inactive account or INSUFFICIENT_BALANCE; 429 too many failed attempts; shared mutation errors. |
| Screen | `/dashboard/treasurer` |
| Source | [`app/api/withdrawal-requests/[id]/disburse/route.ts`](../../app/api/withdrawal-requests/%5Bid%5D/disburse/route.ts) |
| Extracted guard | `loanMutation`; literal roles: TREASURER |

**Validation expression(s), extracted from the handler:**

```ts
withdrawalDisburseSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/withdrawal-requests/id-demo/disburse HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "password": "<treasurer-password>",
  "reference": "DEMO-MM-123",
  "confirm": true
}
```

## POST /api/withdrawal-requests/{id}/reject

**Reject a withdrawal request** · Savings

| Contract | Details |
| --- | --- |
| Authentication | Session · Treasurer |
| Request | JSON: comment (required reason, 3–500 characters). |
| Success response | 200 { id, status: REJECTED }. |
| Conditions | Treasurer; request must be PENDING. Another Treasurer must handle a request from a Treasurer's own linked membership. |
| Effects and audit | Stores reviewer, timestamp and comment; member notification; REJECT WithdrawalRequest audit. Releases the reserved amount. |
| Errors | 400 invalid comment; 403 own request; 404 missing request; 409 already reviewed; shared mutation errors. |
| Screen | `/dashboard/treasurer` |
| Source | [`app/api/withdrawal-requests/[id]/reject/route.ts`](../../app/api/withdrawal-requests/%5Bid%5D/reject/route.ts) |
| Extracted guard | `loanMutation`; literal roles: TREASURER |

**Validation expression(s), extracted from the handler:**

```ts
withdrawalRejectSchema
```

See [validation reference](validation.md) for schema definitions and helper rules.

```http
POST /api/withdrawal-requests/id-demo/reject HTTP/1.1
Host: localhost:3000
Cookie: <session-cookie-from-sign-in>
Content-Type: application/json

{
  "comment": "Example: please visit the office to confirm"
}
```
