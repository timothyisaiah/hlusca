# API conventions

## Scope and identifiers

The [endpoint reference](generated/endpoints.md) lists every explicitly exported HTTP method in the application route files. A route file may support several operations. NextAuth's catch-all delegates subpaths to the installed NextAuth implementation; its two exported handlers are counted once each rather than inventing separate application route files. Next.js can supply protocol behavior such as automatic OPTIONS handling; only explicit method exports are counted here.

All business URLs are relative to the application origin. Parameters in braces must be replaced with internal IDs. These are different from the human-readable member/account numbers.

| Parameter | Record |
| --- | --- |
| `/api/members/{id}` | Member ID |
| `/api/savings/{accountId}/…` | SavingsAccount ID |
| `/api/loan-applications/{id}/…` | LoanApplication ID, including disbursement |
| `/api/contracts/{id}/…` | LoanContract ID |
| `/api/loans/{id}/…` | Loan ID, created at disbursement |
| `/api/investments/{id}` | MemberInvestment ID |
| `/api/dividend-runs/{id}/…` | DividendRun ID |

## Session and scheduler authentication

The app uses NextAuth Credentials with JWT session cookies. Sign in through `/sign-in` using identifier and password. Session claims include user ID, role, status, memberId and first-password-change requirement. Use the installed NextAuth client helpers for sign-in/sign-out and CSRF handling; this app does not expose a bearer-token login API.

The catch-all forwards to `authHandler` in the local authentication options. Examples of delegated resources include GET `/api/auth/session`, `/api/auth/csrf`, `/api/auth/providers`, and POST `/api/auth/callback/credentials` and `/api/auth/signout`. Their framework-managed requests and responses are separate from the business API contract.

Business APIs require a session except password-reset request/confirmation. `/api/auth/change-password` allows the first-password-change state. `/api/cron/loans/overdue` authenticates with `Authorization: Bearer <CRON_SECRET>` instead of a user role or cookie.

`withRouteAuth` checks the session role and first-login state. The `loanRead` and `loanMutation` wrappers reload an active user from the database and check current role/status. Some custom export handlers use the same active-user resolver. `proxy.ts` performs additional redirects or early authentication rejection. This distinction matters after role/status changes: start a fresh session to update navigation and older session-based guards.

## Requests and validation

Use `Content-Type: application/json` for application mutation requests. Loan and investment/dividend mutations additionally enforce JSON content type, a 400,000-byte body limit, valid JSON, same-origin checks when an Origin header is supplied, and rejection of cross-site fetch metadata. Their success responses return the mutation result directly, not an extra `{ result: … }` envelope.

The [validation reference](generated/validation.md) contains exact schema expressions, transformations and helpers. It is generated without importing the application runtime. Service checks still enforce ownership, state, eligibility, uniqueness and confirmation requirements beyond field schemas.

Loan/investment/dividend monetary writes use decimal strings, such as `"50000.00"`, with at most two decimal places. Savings writes accept strings or numbers; strings are preferred. Rates are percentage strings. Date-only inputs use the formats documented per operation; serialized timestamps are ISO values. Do not send JavaScript floating-point calculations as an assumed exact monetary result.

PATCH for loan types and investment products takes the complete product payload. Member profile PATCH allows selected optional fields. Investment close PATCH takes only the closing status. Unknown investment/dividend payload fields are rejected by strict schemas.

## Responses and errors

Business successes currently use status 200, including record creation. The reference describes each shape. Prisma Decimal values serialize to strings; nullable fields remain null. CSV, PDF and PNG endpoints return bytes and the listed Content-Type rather than JSON.

| Response | Meaning |
| --- | --- |
| `200` | Success; inspect the endpoint's response contract |
| `400` | Field validation, invalid date, password rules or business input failure |
| `401` | No usable session/active account, or invalid cron authorization |
| `403` | Role, ownership, required password change, same-origin or separation-of-duties restriction |
| `404` | Record absent; some ownership-scoped lookups deliberately return not found |
| `409` | Duplicate, already completed action, insufficient balance or incompatible business state |
| `413` / `415` | Body too large / JSON content type required by the financial mutation wrapper |
| `500` | Unexpected error; see operator logs |
| `503` | Database busy when mapped by the common handler, or missing/short cron configuration |

Ordinary application errors have `{ error: string, code?: string }`. Zod validation returns `{ error: "Validation failed.", details: { formErrors, fieldErrors } }`. Some early proxy and profile denials return only `{ error }`. Error codes are optional, and the framework authentication routes have a different contract.

```json
{
  "error": "The withdrawal amount exceeds the available savings balance.",
  "code": "INSUFFICIENT_BALANCE"
}
```

## Pagination and exports

| Resource | JSON paging | Export |
| --- | --- | --- |
| Member list | Full array | No dedicated member-list export endpoint |
| Savings transactions | page defaults 1; pageSize defaults 8, maximum 100 | format=csv or pdf; all filtered rows |
| Loan applications | page defaults 1; 10 rows | Separate `/export?format=csv` or pdf; maximum 5,000 matching records |
| Loan statement | page defaults 1; 20 rows | format=csv or pdf; maximum 5,000 matching rows; omit format for JSON |
| Investment/product/dividend lists | Full matching arrays | No dedicated export endpoints |

Loan application and statement exports write EXPORT audit events; savings exports currently do not. Read visibility and export visibility share the documented record scope. Menu access alone is not the authorization boundary.

## Retry and confirmation behavior

Disbursement and dividend posting reject repeats after completion and serialize competing attempts. Loan payment references are normalized and unique within a loan. Savings references are not unique keys, and repeating a savings write can create another entry. After a timeout, inspect the record/ledger before deciding whether a new request is appropriate.

Loan disbursement and dividend posting require the Treasurer's password and `confirm: true`. Loan payments require `confirm: true`; signing requires `agree: true` and the retained document hash. These controls do not substitute for server-side role and ownership checks.

Source references: [route guards](../lib/auth/rbac.ts), [financial wrappers](../lib/loans/routes.ts), [error mapping](../lib/api.ts), [proxy](../proxy.ts), [NextAuth handler](../app/api/auth/%5B...nextauth%5D/route.ts).

