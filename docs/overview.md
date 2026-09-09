# Start here

HLUSCA supports the daily work of a Savings and Credit Cooperative: enrolling members, recording savings, processing loans and repayments, recording investments, and distributing approved dividends. Amounts are shown in Uganda shillings (UGX).

This handbook documents the code included with this copy. It includes the current investments and dividends implementation. Its source fingerprint identifies the reviewed application files; it does not establish which migrations or version a deployed instance is running.

## Choose your first task

| I want to… | Start here |
| --- | --- |
| Sign in for the first time or recover access | [Getting started](getting-started.md) |
| Enroll someone or update their role | [Members and administration](members.md) |
| View savings or record a deposit/withdrawal | [Savings and ledgers](savings.md) |
| Apply, approve, sign, disburse or record a repayment | [Loans and repayments](loans.md) |
| Record an investment or process annual dividends | [Investments and dividends](investments.md) |
| Find a menu or determine who can perform an action | [Screen directory](generated/navigation.md) and [action matrix](generated/actions.md) |
| Integrate, troubleshoot or maintain the system | [API conventions](api.md), [endpoint reference](generated/endpoints.md) and [operations](technical.md) |

## Use this handbook

Enter words such as **record repayment**, **password**, **dividends**, **403**, or an endpoint path in the search field. All words must occur within a topic. Choose **Guide audience** to narrow chapters to relevant readers; this reading filter does not change application permissions. **Clear** restores every chapter. Press **/** to focus search when you are not typing in a field.

Use the contents sidebar on a computer, or the contents button on a phone. Heading links provide bookmarks to individual topics. The **Print / Save PDF** button prints the complete handbook, including sections hidden by search. Choose your browser's Save as PDF destination for a shareable snapshot.

The HTML embeds its own styling, search and images, so it works offline. Links to application source files work when the handbook remains in the repository's docs directory. A standalone copy still contains all instructions and reference content.

## Roles and handoffs

| Role | Responsibility | Landing screen |
| --- | --- | --- |
| Member (CLIENT in code) | Own profile and finances; apply and sign | Dashboard |
| Treasurer | Savings operations, first loan review, disbursement, receipts, dividend proposals/posting | Treasurer Desk |
| Board | Required second loan review and dividend decisions | Board Desk |
| Administrator | Membership, roles and product configuration; staff visibility | Admin Overview |

An Administrator's role does not grant Treasurer or Board financial actions. A staff login linked to a member also remains subject to restrictions on handling their own loans. See the action matrix for exact conditions.

```flow
Administrator enrolls a member and hands over access details
Member changes the temporary password
Treasurer records first savings deposit; pending membership becomes active
Member can apply for an eligible loan and follow its progress
```

## What is available in this iteration

Membership, savings ledgers and exports, loan products, applications, approvals, retained agreements, signatures, disbursement, schedules, repayments, statements, the overdue job, investments, and dividends are implemented in the current working tree.

The Board and Administrator landing pages contain summary counts. The full audit-log viewer and portfolio reporting workspace are still planned in the build specification. Their descriptions in the specification or sidebar text do not create additional screens. There is no implemented loan-cancellation button, repayment correction/waiver workflow, automatic investment-return payout, or general notification-delivery service.

## Terms used throughout

| Term | Meaning |
| --- | --- |
| Member number | Human-readable identity such as HLUSCA-000123; can be used to sign in |
| Member ID / account ID | Separate internal identifiers; API requests require the correct one |
| Application ID / Loan ID / contract ID | Three different records; a Loan is created at disbursement |
| Principal | Gross amount borrowed or invested |
| Net disbursement | Loan principal after the processing fee is withheld |
| Scheduled balance | Remaining contractual principal and interest on a loan |
| Ledger | Recorded financial entries and the balances they produce |
| Proposal / posting | Dividend calculation awaiting decisions / actual approved credits to savings |
| Audit event | Stored record of an action, actor and outcome; coverage varies by operation |

