# Getting started

## Sign in

1. Open the application address supplied by your cooperative. The sign-in page is `/sign-in`.
2. Enter your member number, username, phone number or email in the identifier field. Use the international phone format, for example `+256700000123`.
3. Enter your password and select **Sign in**.
4. If instructed to change a temporary password, complete that step before opening your dashboard.
5. After sign-in, the application directs you to the landing page for your assigned role.

Your Administrator supplies the original member number, username and temporary password. A suspended login cannot sign in. Membership status and login status are different: a newly enrolled PENDING member has an active login and can view their information before first savings activation.

## First sign-in and password changes

1. On **Change password**, enter your current temporary password.
2. Choose a new password with at least 10 characters, one lowercase letter, one uppercase letter, one number and one symbol. Confirm it in the form where prompted.
3. Submit the change. The application clears the first-login requirement.
4. Sign in again when the form redirects you, using your new password. This establishes fresh session information.

You can also open `/change-password` while signed in. The current password is always required. The application never asks you to share that password with another role as part of approving a loan or dividend: Treasurers confirm their own passwords when disbursing or posting.

## Recover a forgotten password

1. Select **Forgot password** from sign-in, or open `/forgot-password`.
2. Enter the same identifier you normally use to sign in and request recovery.
3. Follow the channel and token/code instructions shown. The pilot displays a preview reset token when one is generated.
4. Enter the token/code and a new strong password, then submit the reset form.
5. Return to sign-in and use the new password.

A reset token expires after 15 minutes and can be consumed once. Email is preferred when the account has an email address; phone is the next choice. The current implementation stores notifications and returns a preview token; it does not send email or SMS. If the form indicates administrator-assisted recovery or no usable token, contact the cooperative Administrator. There is no dedicated administrator-assisted reset screen implemented yet.

## Find your way around

On a computer, use the left sidebar. It can be collapsed into icons; expand it to see menu names, and hover a menu item for a short description. If the window is short, the menu scrolls on its own while **Sign out** stays visible at the bottom. On a phone, select **Open navigation** in the top bar, choose a destination, then close the drawer if needed. The application remembers the desktop sidebar preference on that browser. Page layouts adapt to the space left beside the sidebar, so expanding or collapsing it re-flows cards without hiding figures.

| Your role | Sidebar destinations |
| --- | --- |
| Member | Dashboard, Profile, Loans, Investments |
| Treasurer | Treasurer Desk, Loans, Investments, Dividends, Member Earnings |
| Board | Board Desk, Loans, Investments, Dividends, Member Earnings |
| Administrator | Admin Overview, Members, Loans, Investments, Dividends, Member Earnings, Loan Configuration |

The [generated screen directory](generated/navigation.md) is the definitive menu inventory. Detail pages open from lists. For example, a Treasurer opens a member ledger from Treasurer Desk; a loan record opens from Loans. Use the page's back link to return to the relevant list.

## Sign out and role changes

Use **Sign out** in the sidebar when finished. After an Administrator changes your system role, sign out and sign in again so the navigation and session reflect that role. Some financial handlers reload your current account from the database, while other pages and APIs read the session's existing role claim; an old session can therefore show an outdated menu or reject an action.

## When access does not work

| Symptom | What to do |
| --- | --- |
| Invalid credentials | Recheck identifier and password; try your member number or request recovery |
| Repeatedly returned to Change password | Complete the password change and sign in again |
| A menu is absent | Check the role shown in the header against the screen directory |
| Forbidden / 403 | Check role, ownership and workflow stage; signing in again may be needed after a role change |
| A record cannot be found / 404 | Return to the list; Members cannot open another member's loan or agreement |
| Invalid or expired reset token | Request a fresh token and complete recovery within 15 minutes |
| Database busy | Wait briefly and refresh the record; verify whether the action completed before resubmitting |

Source references: [navigation](../lib/dashboard/navigation.ts), [session guards](../lib/auth/server.ts), [login configuration](../lib/auth/options.ts), [password validation](../lib/auth/passwords.ts), [recovery service](../lib/members/service.ts).

