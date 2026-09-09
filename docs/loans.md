# Loans and repayments

## The loan journey

```flow
Member submits an eligible application
Treasurer reviews; Board also reviews when the frozen threshold requires it
Final approval creates the agreement; Member reviews and signs
Treasurer confirms password and disburses to savings
Treasurer records external repayment receipts; Member follows the statement
Loan closes when scheduled principal and interest are fully repaid
```

Rejection ends the application's review path and records a reason. A product edit does not rewrite an application already submitted. Loan, application, contract and schedule statuses describe different stages; see the status table below.

## Administrator: configure loan products

1. Open **Loan Configuration**.
2. Under **Create loan type**, enter a name, interest method, annual interest rate, maximum term, maximum multiple of savings and processing fee percentage.
3. Select **Create loan type**. No loan products are seeded with assumed terms, so this is required before members can apply.
4. To change a product, open its edit action and select **Save loan type**. Deactivate a product when it should no longer accept new applications.
5. Set the Board approval threshold and select **Save threshold**.

Interest rates are annual percentages; monthly interest uses the annual percentage divided by 12. The threshold includes equality: an amount equal to or above it requires both Treasurer and Board approval. Lower amounts require Treasurer approval only. Application submission freezes the product terms and threshold; changes affect new applications.

## Member: apply for a loan

1. Open **Loans**, then its application action to reach `/dashboard/loans/apply`.
2. In **Loan & amount**, choose a loan type and enter the requested amount. Select **Continue**.
3. In **Terms & purpose**, choose the repayment term and explain the purpose in at least 10 characters. Select **Continue**.
4. In **Review & submit**, review eligibility, fees, savings credit, total repayable and schedule preview. Use **Back** if something needs correction.
5. Select **Submit application** when eligible.
6. Open the application in **Loans** to follow its approval steps and any rejection reason or recent notification.

Eligibility requires active membership and savings account, an available product, a term within the product limit, and enough savings for the product's lending multiple. The preview explains why an application is ineligible. It is recalculated on submission and eligibility is checked again at disbursement. The pilot does not place collateral holds on savings.

## Treasurer and Board: review applications

1. Choose **Loans**. The staff review queue defaults to **Awaiting my review** for Treasurer and Board.
2. Use search, status and date filters to locate an application.
3. Open its details; review the applicant, amount, purpose, product terms and approval steps.
4. Enter a **Review comment (required when rejecting)**. Rejection needs at least three characters.
5. Choose the displayed approval action or **Reject application**. For the Treasurer's first step in a two-stage chain, the approval action indicates a recommendation to the Board.
6. Read the confirmation dialog and select **Confirm approval** or **Confirm rejection**.
7. Check the updated status and approval history.

Only the role for the next pending step can decide. The Treasurer must review before the Board. A reviewer cannot act on their own member application, and one person cannot complete both steps by changing roles. Once a final approval succeeds, the agreement is created automatically.

If an approved application disappears from your review queue, clear **Awaiting my review** to find it. Administrator can inspect applications, but does not receive Treasurer or Board decision controls.

## Member: review and sign the agreement

1. Open the approved application from **Loans**.
2. Read the complete agreement, product terms, fee, net credit and repayment preview. Open the agreement PDF for the retained document.
3. Under **Sign your agreement**, type your full name exactly as shown on the contract.
4. Draw your signature in the signature area. Use its clear/reset action if necessary.
5. Select the agreement checkbox and choose **Review and sign**.
6. Review the confirmation, then select **Confirm and sign**.
7. Verify the displayed signed name, timestamp and signature.

The server validates the PNG image, name, consent, contract ownership, active membership and document hash. The original PDF is retained unchanged. Signing stores the signature and evidence for that exact document; the application does not expose a signature-edit action afterward. Actual schedule dates are fixed when disbursement occurs.

## Treasurer: disburse funds

1. Open **Loans** and clear **Awaiting my review** if needed.
2. Open the approved, signed application. Review the amount shown under **Disburse this loan**.
3. Select **Review disbursement**.
4. Verify the member, gross principal, withheld fee and resulting savings credit.
5. Enter your own password under **Confirm your Treasurer password**.
6. Select **Confirm and disburse**.
7. Confirm that the Loan and repayment schedule appear and the net credit is visible in savings.

A Treasurer cannot disburse their own loan. The server rechecks approval, signature integrity, active membership/account and savings-based eligibility. It creates the Loan, complete monthly schedule, savings credit, notification and audit together. Repeated disbursement requests are rejected.

For example, a principal of UGX 300,000 with a 2% processing fee credits UGX 294,000 to savings. The principal repayable remains UGX 300,000, plus the scheduled interest. This example illustrates behavior and does not prescribe product terms.

## Treasurer: record a repayment

1. Open the disbursed application from **Loans** and find its repayment workspace.
2. Enter the amount, actual calendar payment date, payment method (cash, bank transfer or mobile money) and receipt reference.
3. Choose a target installment only if that receipt should prioritize a specific installment; otherwise use normal allocation order.
4. Review the payment details using the form's review action.
5. Check the confirmation and select **Confirm payment**.
6. Verify the receipt, installment matches, outstanding balance and updated schedule.

Another Treasurer must record a Treasurer-member's own loan receipt. The payment date must fall between disbursement and today in Africa/Kampala. References are trimmed and uppercased, and must be unique within the loan. An amount above one installment can cover later installments, but an amount above the entire scheduled balance is rejected.

Receipts record funds received outside the savings ledger; they do not debit savings. The receipt itself is immutable, and the pilot does not include a correction, deletion or waiver workflow. Check all details before confirmation. After an interrupted submission, inspect the statement before repeating the request; a duplicate reference produces a conflict instead of another receipt.

## How payments are matched

Normal matching starts at the oldest unpaid installment. It pays interest before principal within each installment, then continues to later installments. A selected target installment, or a reference such as `INST-3/DEMO-RECEIPT-123`, prioritizes installment 3; any remainder then follows normal due-date order.

Partial payments preserve the exact remaining principal and interest. An overdue installment that is partly paid remains overdue. The final payment closes the loan when its scheduled balance reaches zero.

Backdated receipts cause all receipts to be replayed by payment date, recording timestamp and ID. This can change previous allocation matches; original receipt records remain unchanged. The audit captures the before/after allocation state.

## View and export a statement

1. Open a disbursed application and its repayment statement.
2. Filter by date range, type or reference. The statement's type filter uses disbursement and payment rows.
3. Review principal, interest, amount, running balance and installment allocations.
4. Use pagination for more rows, or the CSV/PDF export action for the current filters.
5. Use the PDF's complete current schedule to compare receipts with future or overdue installments.

Members see their own statements; staff can inspect all. The running balance includes earlier transactions outside the chosen filters. Opening debt includes the full contractual principal and interest. Exports are audited and limited to 5,000 matching rows; narrow the filters if necessary.

## Status reference

| Record | Status | Meaning |
| --- | --- | --- |
| Application | SUBMITTED | Waiting for first review |
| Application | UNDER_REVIEW | Treasurer completed the first step; further approval needed |
| Application | APPROVED | Final approval complete; agreement available |
| Application | REJECTED | Review ended with a recorded reason |
| Contract | AWAITING_SIGNATURE / SIGNED | Retained agreement awaits or has received the member signature |
| Loan | ACTIVE / CLOSED | Disbursed debt remains / debt fully repaid |
| Schedule | PENDING / PARTIAL / PAID / OVERDUE | Due installment waiting / partly paid / fully paid / unpaid after its due date |

Other enum values exist in storage, including CANCELLED applications, DEFAULTED loans and WAIVED installments. Their existence does not imply a supported cancellation, defaulting or waiver screen. The daily overdue job flags eligible installments; it does not add penalties or automatically default loans.

## Resolve common loan problems

| Problem | Next step |
| --- | --- |
| No products are available | Administrator creates or activates a loan type |
| Eligibility preview rejects amount or term | Review savings balance and the selected product's limits |
| Another reviewer must decide | Wait for the current pending approval step to finish |
| No signing controls | Confirm Member ownership and approved/awaiting-signature state |
| Cannot disburse | Verify signature, current eligibility, account status and Treasurer password |
| Receipt already recorded | Search the statement by its normalized reference |
| Statement balance differs from visible rows | Check opening debt and transactions excluded by filters |

Source references: [loan service](../lib/loans/service.ts), [application details](../components/loans/application-detail.tsx), [repayment reconciliation](../lib/loans/reconciliation.ts), [repayment workspace](../components/loans/repayment-workspace.tsx).

