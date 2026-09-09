# Savings and ledgers

## Member: view your savings

1. Choose **Dashboard**.
2. Review the primary savings balance, member number and account status.
3. Scroll to **Transaction log** for individual entries. The dashboard also shows savings activity summaries and posted dividend history.
4. Use the transaction search, type and date filters to narrow the log. Search can match references, notes or the recorded-by information exposed by the ledger.
5. Use the page controls to move through results, or **Export CSV** / **Export PDF** for a download of matching entries.

The current balance is the account balance, not a total of only the rows visible on the current page. Deposits, loan disbursements and posted dividends can increase savings. The separate loan-payment receipt workflow does not reduce savings.

## Treasurer: locate a member ledger

1. Choose **Treasurer Desk**.
2. Review the savings summary, member ledgers and recent activity.
3. Search the member-ledger list and open the intended member.
4. Verify member number and savings account before recording an entry.
5. Use the member ledger's back link to return to Treasurer Desk after completing the task.

The desk and ledger provide **Record deposit** and **Record withdrawal** actions. On a smaller screen, some table content appears as cards or in a horizontally scrollable list.

## Treasurer: record a deposit

1. Locate the member and select **Record deposit**.
2. Enter a positive amount with no more than two decimal places.
3. Enter a useful **Reference** and **Narrative**, such as the receipt identifier and reason. Reference is limited to 80 characters, narrative to 240.
4. Verify the member and amount, then select **Post deposit**.
5. Wait for the success message and confirm that the balance and transaction log update.

The account must be ACTIVE. A deposit on a PENDING membership also changes that membership to ACTIVE. The ledger entry, balance change, membership activation where applicable, and success audit commit together.

## Treasurer: record a withdrawal

1. Locate the member and select **Record withdrawal**.
2. Enter amount, reference and narrative.
3. Compare the requested amount with available savings.
4. Select **Post withdrawal** and verify the success message, new balance and WITHDRAWAL entry.

Withdrawals cannot exceed the available balance. The current savings handlers require an active savings account; they do not impose the loan-specific restriction against a Treasurer acting on their own account. A membership status change alone does not close or suspend that account.

## Understand ledger entries

| Type | Effect / current workflow |
| --- | --- |
| DEPOSIT | Recorded by Treasurer; increases savings |
| WITHDRAWAL | Recorded by Treasurer; reduces savings |
| LOAN_DISBURSEMENT | Created by approved loan disbursement; credits the amount after fee |
| DIVIDEND | Created when Treasurer posts a Board-approved run |
| INTEREST | Recognized ledger type; no general manual interest-posting screen is implemented |
| LOAN_REPAYMENT | Recognized savings-ledger type; the current repayment receipt workflow records LoanPayment instead and leaves savings unchanged |

## Exports and dates

Savings exports include every matching ledger row, not only the current page. JSON accepts `pageSize` from 1 to 100, default 8; exports ignore pagination. The savings export route currently does not create an EXPORT audit event. Loan application and statement exports have their own audited implementation.

Savings filter date boundaries use the server's local date operations. Repayment calendar dates and dividend daily-balance calculations explicitly use Africa/Kampala. When reconciling a boundary-date discrepancy, consult the stored transaction timestamp and deployment timezone with an operator.

## When an entry fails

| Message / situation | Next step |
| --- | --- |
| Account inactive | Verify account status with an Administrator/operator |
| Insufficient balance | Reduce the withdrawal to the legitimate available amount or resolve the account discrepancy |
| Validation failed | Check positive amount, decimal places and field lengths |
| Browser interruption after submission | Refresh and inspect ledger entries and balance before submitting again |
| Incorrect successful entry | Contact the cooperative's responsible operator; this pilot has no dedicated savings reversal or correction screen |

Savings references are descriptive and are not enforced as unique idempotency keys. Repeating a deposit or withdrawal request can create another entry. This differs from loan receipts, whose reference is unique within the loan.

Source references: [savings service](../lib/savings/service.ts), [ledger route](../app/api/members/%5Bid%5D/transactions/route.ts), [entry form](../components/forms/savings-transaction-form.tsx).

