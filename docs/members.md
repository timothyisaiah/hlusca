# Members and administration

## Administrator: enroll a member

1. Sign in as Administrator and choose **Members**.
2. Open the enrollment action to reach **Enroll a new member** at `/dashboard/admin/members/new`.
3. Enter first and last names, username, phone, address, national ID, and next-of-kin name and phone. Email, birth date and photo URL are optional.
4. Use international phone numbers with a leading `+`. Choose a unique username of 3–32 characters using letters, digits, dots, underscores or hyphens.
5. Submit the enrollment form. Correct field errors such as an existing username or phone number, then submit again.
6. On success, record the displayed member number and temporary password for handover to that member. The result also identifies the credential delivery method.
7. Open the new profile to verify the details. The member must change the temporary password at first sign-in.

Enrollment creates three linked records in one transaction: a PENDING member, an ACTIVE CLIENT login requiring a password change, and an ACTIVE savings account with zero balance. It also stores a welcome notification and an audit event. The current notification implementation does not send SMS; arrange the actual credential handover through the cooperative's process.

## Administrator: find and update a member

1. Choose **Members** and search by member number, name, phone or username.
2. Open the required record and verify the displayed member identity.
3. Edit the relevant fields under **Member profile**. Administrator fields include identity details, **Status**, **System role** and contact details.
4. Select **Save profile** and check the success message.
5. Refresh the profile to verify the saved linked role. Ask a user whose role changed to sign out and sign in again.

You cannot change your own system role. Changing membership status here does not automatically suspend the linked login or savings account. The pilot does not expose a general-purpose staff-account administration screen; this form manages a login linked to a member. The bootstrap command is used separately for initial administrator setup.

## Member: update your contact information

1. Choose **Profile** from the sidebar.
2. Update address, phone, email or next-of-kin details.
3. Select **Save profile**.
4. Confirm that the updated contact information appears.

Members can update their own contact fields only. Names, national ID, member status and system role require an Administrator. A changed phone or email can affect the identifiers used for sign-in and recovery.

## Activation and account status

| Record | States | Operational meaning |
| --- | --- | --- |
| Membership | PENDING, ACTIVE, SUSPENDED, EXITED | Enrollment starts PENDING; a first savings deposit activates a pending member. Active membership is required for new borrowing and investment/dividend eligibility |
| Login | ACTIVE, SUSPENDED | Controls whether credentials are accepted; distinct from membership |
| Savings account | ACTIVE, SUSPENDED, CLOSED | Savings entries require an active account; borrowing and dividend posting also check account status |

These records are intentionally described separately because the current profile handler does not automatically synchronize all their statuses. Use the [action matrix](generated/actions.md) for the actual checks applied by each action.

## Administrator: configure financial products

Use **Loan Configuration** to create loan types and set the Board approval threshold; see [loan configuration](loans.md#administrator-configure-loan-products). Use **Investments** to create investment products and record externally funded holdings; see [investment administration](investments.md#administrator-create-an-investment-product).

Administrator access includes reviewing applications and dividend runs, but their approval, disbursement and posting controls belong to the specified Treasurer or Board roles.

## Common membership problems

| Problem | Resolution |
| --- | --- |
| Identifier already in use | Search existing member records and correct the username, phone or email; do not create a duplicate member |
| Member is pending | Treasurer records the first legitimate deposit; a pending membership activates on deposit |
| Phone validation fails | Include country code and leading +; remove spaces and punctuation not accepted by the form |
| Cannot change own role | Another Administrator must perform the authorized role change |
| Saved role looks unchanged | Refresh the profile, then have the affected user start a new session |

Source references: [membership routes](../app/api/members/route.ts), [profile route](../app/api/members/%5Bid%5D/route.ts), [membership service](../lib/members/service.ts), [profile form](../components/forms/member-profile-form.tsx).

