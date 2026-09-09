# Investments and dividends

## Administrator: create an investment product

1. Open **Investments**.
2. Under **Create investment product**, enter name, description, expected annual return percentage and risk profile.
3. Choose whether the product is active and select **Create product**.
4. To change a product, use its edit action and select **Save product**. Deactivate it when it should no longer be offered for new holdings.

Expected return is stored as a product term; it does not schedule a payment or guarantee a result. Risk profile is LOW, MEDIUM or HIGH. Product names must be unique. Existing holdings retain their recorded product name, rate and risk when products are edited.

## Administrator: record an investment

1. In **Investments**, find **Record member investment**.
2. Select an active member and an active product.
3. Enter the principal, start date and maturity date. Start cannot be in the future; maturity must be after start.
4. Check the member, product and amount, then select **Record investment**.
5. Verify the ACTIVE holding appears in the holdings list.

These are records of investments funded outside this savings ledger. Recording a holding does not debit savings or transfer funds. The holding stores a snapshot of the product terms at the time it was recorded.

## Administrator: close a holding

1. Locate the ACTIVE holding in **Investments**.
2. Choose its maturity action when the maturity date has been reached, or **Cancel investment** when the record should be cancelled.
3. Review the selected status and choose **Confirm status**.
4. Verify MATURED or CANCELLED in the list.

The server checks maturity against the Kampala calendar date. Already closed holdings cannot be closed again. Closing a holding does not automatically pay principal or returns into savings.

## Member and staff: inspect investments

Members choose **Investments** to see their own holdings and posted dividend history. Treasurer and Board have read access to holdings across members; Administrator also has product and holding controls. Use search in the holdings table to locate a member, product or holding. A Member cannot obtain another member's holdings or dividend history by changing the URL or API filter.

## Dividend workflow

```flow
Treasurer chooses a completed financial year and dividend pool
Application calculates and freezes eligible member allocations
Board approves or rejects with a comment
Treasurer confirms password and posts an approved run
Savings balances receive credits; posted history becomes visible to members
```

The creator cannot review their own proposal, even after changing to Board. A run's approver cannot post it after changing to Treasurer. The Treasurer who created a proposal may post it after a different Board reviewer approves it.

## Treasurer: calculate a proposal

1. Choose **Dividends**.
2. Enter the ending financial year, inclusive start and end dates, and total pool.
3. Select one completed 12-month year. The default is January–December of the previous year. Financial year must match the period's ending year.
4. Submit the calculation form and wait for the proposal to appear.
5. Choose **Review** for that financial year to inspect member allocations, average savings and the total.
6. Have a Board user review the frozen proposal.

The current method is `PRO_RATA_AVERAGE_DAILY_SAVINGS`. Another nonrejected run cannot overlap the same dates. A rejected proposal may be replaced. The calculation requires eligible members with positive average savings and a complete savings history, including opening balances.

## How the proposal is calculated

Each member's daily closing savings balance is determined in Africa/Kampala from the UTC ledger. The calculation includes all days in the year, leap days and zero days before their first savings. It averages those balances and allocates the pool proportionally across eligible members.

Eligibility is fixed at proposal time: active membership, active savings account opened before year-end, and positive average savings. The current balance alone is not used as a shortcut. The service saves exact balance-day weights and rounded shares; largest remainders allocate every cent of the pool with stable member-ID tie breaking. A rounded zero share is retained without a zero-value savings transaction.

Later savings activity does not recalculate an approved proposal. Before posting, the service rechecks recipient member/account status and the integrity of the saved allocations. A recipient becoming inactive blocks the whole posting transaction.

## Board: approve or reject a proposal

1. Open **Dividends** and choose **Review** for the intended financial year.
2. Review the inclusive year dates, pool, calculation method and member allocations. Use the allocation search where helpful.
3. Choose **Approve dividend run** or **Reject proposal**.
4. Enter a comment of at least three characters in the decision dialog.
5. Confirm the decision and verify the resulting APPROVED or REJECTED status.

Only PROPOSED runs can be decided. Board cannot directly credit financial records from this screen. Administrator can inspect runs but cannot approve or post them.

## Treasurer: post an approved run

1. Open **Dividends**, then review the APPROVED financial-year run.
2. Choose the posting action and review its confirmation dialog.
3. Enter your own password under **Confirm your password** and select the confirmation checkbox.
4. Select **Confirm posting**.
5. Verify POSTED status, the member allocations and resulting dividend history or savings entries.

Posting commits allocations, positive dividend credits, savings balances, posted state and one audit event together. Repeated or concurrent posting cannot pay the same run twice. If posting fails, inspect the specific error and resolve its cause before trying again; a changed recipient status or inconsistent allocation requires investigation.

## Member: find dividend history

Open **Dashboard** for posted dividends alongside savings, or **Investments** for the history shown there. Proposed and approved-but-unposted runs do not appear in member history. Each posted entry identifies the financial year, amount and average savings used.

## Common problems

| Problem | Next step |
| --- | --- |
| Year not complete or ending year mismatches | Correct the period and choose a year that has already ended |
| Period overlaps an existing run | Review the existing proposal/run instead of calculating a duplicate |
| No eligible positive-weight members | Check active status and completeness of historical savings entries |
| Cannot approve own proposal | Another Board user must review it |
| Approver cannot post | A different Treasurer must post the approved run |
| Recipient inactive at posting | Review the member/account state with an authorized operator; the run remains unposted |
| Holding cannot mature | Check its maturity date and whether it was already closed |

Source references: [investment/dividend service](../lib/investments/service.ts), [calculation](../lib/investments/calculation.ts), [dividend workspace](../components/investments/dividend-workspace.tsx), [investment workspace](../components/investments/investment-workspace.tsx).

