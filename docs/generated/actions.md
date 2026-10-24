> Generated from application source and docs/catalog.mjs. Refresh with npm run docs:generate; edit the catalog or application source, not this file.

# Action matrix

Allowed means the role may attempt the action; the conditions on its endpoint entry still apply. Own records means the linked Member's records only. — means the role grants no access. Public authentication operations and the scheduler are listed separately. Menu visibility is described in the screen directory.

## Access

| Action / API | Member | Treasurer | Board | Administrator | Scope and prerequisites |
| --- | --- | --- | --- | --- | --- |
| [Change your password](endpoints.md#post-api-auth-change-password) | Allowed | Allowed | Allowed | Allowed | Current password must match. Applies to the signed-in user only. |

## Loans

| Action / API | Member | Treasurer | Board | Administrator | Scope and prerequisites |
| --- | --- | --- | --- | --- | --- |
| [Download the retained agreement PDF](endpoints.md#get-api-contracts-id-document) | Own records | Allowed | Allowed | Allowed | Member: own agreement; staff: any agreement. id is the contract ID. |
| [View the saved signature image](endpoints.md#get-api-contracts-id-signature) | Own records | Allowed | Allowed | Allowed | Member: own contract; staff: any contract. A signature must have been stored. |
| [List loan applications](endpoints.md#get-api-loan-applications) | Own records | Allowed | Allowed | Allowed | Member: own applications. Staff: all applications subject to filters. queue=true selects the current review role's pending steps; Board queue excludes applications still awaiting Treasurer review. |
| [View a loan application](endpoints.md#get-api-loan-applications-id) | Own records | Allowed | Allowed | Allowed | Member: own application; staff: any application. id is the application ID. |
| [Export loan applications](endpoints.md#get-api-loan-applications-export) | Own records | Allowed | Allowed | Allowed | Same ownership and filtering as application list. Narrow filters when more than 5,000 records match. |
| [Preview loan eligibility and repayment](endpoints.md#get-api-loan-applications-preview) | Allowed | — | — | — | Member account required; product must be active. Eligibility reasons include inactive membership/account, excessive term, insufficient savings-based limit and nonpositive net disbursement. |
| [Read the Board approval threshold](endpoints.md#get-api-loan-settings) | Allowed | Allowed | Allowed | Allowed | All authenticated roles may read this API; its configuration screen is Administrator-only. |
| [List loan products](endpoints.md#get-api-loan-types) | Allowed | Allowed | Allowed | Allowed | All signed-in roles. Administrator sees inactive products; other roles see active products only. |
| [Set the Board approval threshold](endpoints.md#patch-api-loan-settings) | — | — | — | Allowed | Administrator. Amounts at or above the threshold require a Board step. Applies to new applications only. |
| [Edit or deactivate a loan product](endpoints.md#patch-api-loan-types-id) | — | — | — | Allowed | Administrator; unique product name. Edit/deactivation affects future applications; submitted applications retain their terms. |
| [Sign a loan agreement](endpoints.md#post-api-contracts-id-sign) | Allowed | — | — | — | Member owns the contract and is active; contract awaits signature; submitted hash matches retained PDF. UI requires a review and final confirmation. |
| [Apply for a loan](endpoints.md#post-api-loan-applications) | Allowed | — | — | — | Member's own active membership and active savings account; active product, term within product limit, requested amount ≤ current savings × product multiple, positive net disbursement. |
| [Approve a loan application](endpoints.md#post-api-loan-applications-id-approve) | — | Allowed | Allowed | — | The application must be SUBMITTED or UNDER_REVIEW and awaiting this role's next approval step. Treasurer reviews first. Amounts equal to or above the frozen threshold also require Board approval. You cannot review your own application or complete another step after already reviewing it under a different role. |
| [Ensure an approved application has a contract](endpoints.md#post-api-loan-applications-id-contract) | — | Allowed | Allowed | — | Treasurer or Board; application must be APPROVED. Existing contract is reused; signed evidence is not regenerated. The UI relies on automatic creation at final approval and does not expose a separate generate button. |
| [Disburse an approved and signed loan](endpoints.md#post-api-loan-applications-id-disburse) | — | Allowed | — | — | Treasurer; own-loan disbursement forbidden; approved and signed, not already disbursed; PDF integrity, active member/account and current savings eligibility rechecked. |
| [Reject a loan application](endpoints.md#post-api-loan-applications-id-reject) | — | Allowed | Allowed | — | The application must be SUBMITTED or UNDER_REVIEW and awaiting this role's next approval step. Treasurer reviews first. Amounts equal to or above the frozen threshold also require Board approval. You cannot review your own application or complete another step after already reviewing it under a different role. |
| [Create a loan product](endpoints.md#post-api-loan-types) | — | — | — | Allowed | Administrator; unique product name. Edit/deactivation affects future applications; submitted applications retain their terms. |

## Operations

| Action / API | Member | Treasurer | Board | Administrator | Scope and prerequisites |
| --- | --- | --- | --- | --- | --- |
| [Download the built application handbook](endpoints.md#get-api-handbook) | Allowed | Allowed | Allowed | Allowed | Any signed-in user; the proxy rejects requests without a session. The handler itself performs no role check. |

## Dividends

| Action / API | Member | Treasurer | Board | Administrator | Scope and prerequisites |
| --- | --- | --- | --- | --- | --- |
| [View posted dividend history](endpoints.md#get-api-dividend-history) | Own records | Allowed | Allowed | Allowed | Member: own history; staff: any member. Only POSTED runs appear. |
| [Review dividend runs and allocations](endpoints.md#get-api-dividend-runs) | — | Allowed | Allowed | Allowed | Staff roles only. Member history is served by /api/dividend-history. |
| [Calculate a dividend proposal](endpoints.md#post-api-dividend-runs) | — | Allowed | — | — | Treasurer; period must have ended; no overlapping non-REJECTED run; at least one eligible positive-weight member. Active members and active accounts opened before year end with positive average daily savings qualify. |
| [Approve a dividend proposal](endpoints.md#post-api-dividend-runs-id-approve) | — | — | Allowed | — | Board; run must be PROPOSED. Its creator cannot review it, even after a role change. |
| [Post approved dividends to savings](endpoints.md#post-api-dividend-runs-id-post) | — | Allowed | — | — | Treasurer; valid password; APPROVED and not yet posted; approver cannot post the same run. Rechecks every recipient's member/account status and saved allocation integrity. |
| [Reject a dividend proposal](endpoints.md#post-api-dividend-runs-id-reject) | — | — | Allowed | — | Board; run must be PROPOSED. Its creator cannot review it, even after a role change. |

## Earnings

| Action / API | Member | Treasurer | Board | Administrator | Scope and prerequisites |
| --- | --- | --- | --- | --- | --- |
| [View credited loan earnings](endpoints.md#get-api-earnings-history) | Own records | Allowed | Allowed | Allowed | Member: own history; staff: any member. Only credited (non-retained) shares of POSTED runs appear. |
| [Review member earnings runs](endpoints.md#get-api-earnings-runs) | — | Allowed | Allowed | Allowed | Staff roles only. Member history is served by /api/earnings-history. |
| [Read the member earnings share](endpoints.md#get-api-earnings-settings) | Allowed | Allowed | Allowed | Allowed | All authenticated roles may read this API; the setting is edited on Member Earnings by an Administrator. |
| [Set the member earnings share](endpoints.md#patch-api-earnings-settings) | — | — | — | Allowed | Administrator. Applies to runs calculated afterwards; existing proposals keep their frozen share. |
| [Calculate a month's member earnings](endpoints.md#post-api-earnings-runs) | — | Allowed | — | — | Treasurer; month must have ended (Kampala); no other PROPOSED run; month later than the latest POSTED month; at least some newly collected interest. Interest collected (LoanSchedule.interestPaid) not yet shared by a POSTED run, capped at interest accrued through the month end. Each installment's interest is spread evenly from the previous due date to its due date; new interest funds the earliest unfunded days. Each day's slice is split by every savings account's lowest balance during that Kampala day. |
| [Cancel an earnings proposal](endpoints.md#post-api-earnings-runs-id-cancel) | — | Allowed | — | — | Treasurer; run must be PROPOSED. |
| [Post member earnings to savings](endpoints.md#post-api-earnings-runs-id-post) | — | Allowed | — | — | Treasurer; valid password (five failures in ten minutes pause attempts); run PROPOSED and no later month posted; frozen shares must still total the member pool. |

## Investments

| Action / API | Member | Treasurer | Board | Administrator | Scope and prerequisites |
| --- | --- | --- | --- | --- | --- |
| [List investment products](endpoints.md#get-api-investment-products) | Allowed | Allowed | Allowed | Allowed | All authenticated roles. Administrator sees inactive products; others see active products only. |
| [View member investment holdings](endpoints.md#get-api-investments) | Own records | Allowed | Allowed | Allowed | Member: own investments. Staff: any member's investments. |
| [Edit or deactivate an investment product](endpoints.md#patch-api-investment-products-id) | — | — | — | Allowed | Administrator; product name must be unique. Existing investments retain their snapshotted product terms. |
| [Mark an investment matured or cancelled](endpoints.md#patch-api-investments-id) | — | — | — | Allowed | Administrator; holding must still be ACTIVE. MATURED requires maturity date reached in Kampala; CANCELLED closes an active record. |
| [Create an investment product](endpoints.md#post-api-investment-products) | — | — | — | Allowed | Administrator; product name must be unique. Existing investments retain their snapshotted product terms. |
| [Record an externally funded investment](endpoints.md#post-api-investments) | — | — | — | Allowed | Administrator; ACTIVE member and active product; start not in future; maturity after start. |

## Repayments

| Action / API | Member | Treasurer | Board | Administrator | Scope and prerequisites |
| --- | --- | --- | --- | --- | --- |
| [Read a loan repayment schedule](endpoints.md#get-api-loans-id-schedule) | Own records | Allowed | Allowed | Allowed | Member: own loan; staff: any loan. id is the Loan ID from a disbursed application. |
| [View or export a loan statement](endpoints.md#get-api-loans-id-statement) | Own records | Allowed | Allowed | Allowed | Member: own loan; staff: any loan. Opening scheduled debt contains all contractual principal and interest; filtered-out earlier rows still contribute to running balances. |
| [Record a loan repayment receipt](endpoints.md#post-api-loans-id-payments) | — | Allowed | — | — | Treasurer; another Treasurer must record a Treasurer-member's own loan receipt. Loan not CLOSED, date between disbursement and today in Kampala, unique reference within loan, amount ≤ entire scheduled balance. Target installment must be valid. |

## Membership

| Action / API | Member | Treasurer | Board | Administrator | Scope and prerequisites |
| --- | --- | --- | --- | --- | --- |
| [List member records](endpoints.md#get-api-members) | — | — | — | Allowed | Sign in and complete any required password change. |
| [View a member profile](endpoints.md#get-api-members-id) | Own records | Allowed | Allowed | Allowed | Member: own member ID. Treasurer, Board and Administrator: any member ID. Staff API access does not imply an administration menu. |
| [Update a member profile or role](endpoints.md#patch-api-members-id) | Own records | — | — | Allowed | Member: own record and contact fields. Administrator: any member; cannot change their own system role. Membership status is separate from login and savings-account status. |
| [Enroll a member](endpoints.md#post-api-members) | — | — | — | Allowed | Administrator; unique identifiers. The created login is CLIENT/ACTIVE and membership is PENDING. |

## Savings

| Action / API | Member | Treasurer | Board | Administrator | Scope and prerequisites |
| --- | --- | --- | --- | --- | --- |
| [View or export a savings ledger](endpoints.md#get-api-members-id-transactions) | Own records | Allowed | Allowed | Allowed | Member: own ledger. Treasurer, Board, Administrator: any member ledger. |
| [List withdrawal requests](endpoints.md#get-api-withdrawal-requests) | Own records | Allowed | Allowed | Allowed | Member: own requests. Treasurer, Board and Administrator: all requests. |
| [Record a savings deposit](endpoints.md#post-api-savings-accountid-deposit) | — | Allowed | — | — | Treasurer; savings account must be ACTIVE. The handler does not forbid the Treasurer's own savings account. |
| [Record a savings withdrawal](endpoints.md#post-api-savings-accountid-withdraw) | — | Allowed | — | — | Treasurer; ACTIVE savings account and enough available balance. The handler does not forbid the Treasurer's own savings account. |
| [Request a savings withdrawal](endpoints.md#post-api-withdrawal-requests) | Allowed | — | — | — | Member; ACTIVE membership and savings account. Amount must not exceed the savings balance minus the member's other PENDING or APPROVED requests. |
| [Approve a withdrawal request](endpoints.md#post-api-withdrawal-requests-id-approve) | — | Allowed | — | — | Treasurer; request must be PENDING. The member's savings account must be ACTIVE and its balance must still cover the amount. Another Treasurer must handle a request from a Treasurer's own linked membership. |
| [Cancel your withdrawal request](endpoints.md#post-api-withdrawal-requests-id-cancel) | Allowed | — | — | — | Member; own request; status PENDING or APPROVED. |
| [Pay out an approved withdrawal request](endpoints.md#post-api-withdrawal-requests-id-disburse) | — | Allowed | — | — | Treasurer; valid password; request must be APPROVED; savings account ACTIVE with enough balance at payout. Another Treasurer must handle a request from a Treasurer's own linked membership. Eight failed payout attempts in ten minutes pause further attempts. |
| [Reject a withdrawal request](endpoints.md#post-api-withdrawal-requests-id-reject) | — | Allowed | — | — | Treasurer; request must be PENDING. Another Treasurer must handle a request from a Treasurer's own linked membership. |

## Public and service operations

| Action | Access | Requirement |
| --- | --- | --- |
| [Read authentication/session resources](endpoints.md#get-api-auth-nextauth) | framework | Credentials must match an ACTIVE login account. Identifier may be a member number, username, phone or email. Sign-out uses the current session. |
| [Flag overdue installments](endpoints.md#get-api-cron-loans-overdue) | service | Scheduler secret required; ordinary role membership grants no access. Selects PENDING/PARTIAL installments before today's Kampala date on ACTIVE/DEFAULTED loans. |
| [Sign in or sign out](endpoints.md#post-api-auth-nextauth) | framework | Credentials must match an ACTIVE login account. Identifier may be a member number, username, phone or email. Sign-out uses the current session. |
| [Request password recovery](endpoints.md#post-api-auth-reset-password) | public | No session required. Email is preferred when present, otherwise phone, otherwise administrator assistance. An unmatched identifier returns null fields. |
| [Complete password recovery](endpoints.md#post-api-auth-reset-password-confirm) | public | No session required; token must match an unconsumed, unexpired request for the resolved user. |
