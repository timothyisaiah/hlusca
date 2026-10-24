> Generated from application source and docs/catalog.mjs. Refresh with npm run docs:generate; edit the catalog or application source, not this file.

# Screen directory

## Sidebar menus

Labels, destinations and roles below are extracted directly from lib/dashboard/navigation.ts. On mobile, use Open navigation. Expand the desktop sidebar if only icons are visible.

| Menu label | Destination | Visible to | Purpose |
| --- | --- | --- | --- |
| Dashboard | `/dashboard/client` | Member | Your member summary and account details. |
| Profile | `/dashboard/client/profile` | Member | Keep your contact information current. |
| Treasurer Desk | `/dashboard/treasurer` | Treasurer | Operational finance actions and queues. |
| Board Desk | `/dashboard/board` | Board | Approvals, oversight, and audit visibility. |
| Admin Overview | `/dashboard/admin` | Administrator | Enrollment, settings, and governance controls. |
| Members | `/dashboard/admin/members` | Administrator | Browse and maintain member records. |
| Loans | `/dashboard/loans` | Member, Treasurer, Board, Administrator | Applications, approvals, contracts, and disbursement. |
| Investments | `/dashboard/investments` | Member, Treasurer, Board, Administrator | Investment products and member holdings. |
| Dividends | `/dashboard/dividends` | Treasurer, Board, Administrator | Financial-year proposals, approvals, and posting. |
| Member Earnings | `/dashboard/earnings` | Treasurer, Board, Administrator | Monthly share of collected loan interest by daily balances. |
| Loan Configuration | `/dashboard/admin/loan-types` | Administrator | Loan products and approval routing. |

## All pages and redirects

Paths in braces require the indicated record ID. Loan details use an application ID; Treasurer member ledgers use a member ID. Everyone below means all four roles after sign-in, except the explicitly public entry pages.

| Screen | Path | Audience | How to use | Source |
| --- | --- | --- | --- | --- |
| [Change password](../getting-started.md) | `/change-password` | Everyone (see description) | Signed-in users only; required on first sign-in with temporary credentials. | [`app/(auth)/change-password/page.tsx`](../../app/%28auth%29/change-password/page.tsx) |
| [Password recovery](../getting-started.md) | `/forgot-password` | Everyone (see description) | Request and enter a reset code/token; pilot preview is shown here. | [`app/(auth)/forgot-password/page.tsx`](../../app/%28auth%29/forgot-password/page.tsx) |
| [Sign in](../getting-started.md) | `/sign-in` | Everyone (see description) | Enter member number, username, phone or email and password. Signed-in users are redirected. | [`app/(auth)/sign-in/page.tsx`](../../app/%28auth%29/sign-in/page.tsx) |
| [Loan Configuration](../loans.md) | `/dashboard/admin/loan-types` | Administrator | Configure loan products and the Board approval threshold. | [`app/dashboard/admin/loan-types/page.tsx`](../../app/dashboard/admin/loan-types/page.tsx) |
| [Member profile](../members.md) | `/dashboard/admin/members/{id}` | Administrator | Maintain identity/contact details, membership status and linked system role. | [`app/dashboard/admin/members/[id]/page.tsx`](../../app/dashboard/admin/members/%5Bid%5D/page.tsx) |
| [Enroll a new member](../members.md) | `/dashboard/admin/members/new` | Administrator | Create profile, login and savings account; collect temporary credentials for handover. | [`app/dashboard/admin/members/new/page.tsx`](../../app/dashboard/admin/members/new/page.tsx) |
| [Members](../members.md) | `/dashboard/admin/members` | Administrator | Search member number, name, phone or username; open a profile or enroll a member. | [`app/dashboard/admin/members/page.tsx`](../../app/dashboard/admin/members/page.tsx) |
| [Admin Overview](../members.md) | `/dashboard/admin` | Administrator | Member counts and Board threshold summary. | [`app/dashboard/admin/page.tsx`](../../app/dashboard/admin/page.tsx) |
| [Board Desk](../investments.md) | `/dashboard/board` | Board | Member-count oversight snapshot; use Loans and Dividends for decisions. | [`app/dashboard/board/page.tsx`](../../app/dashboard/board/page.tsx) |
| [Member dashboard](../savings.md) | `/dashboard/client` | Member | Savings summary, withdrawal requests, loan earnings, own transaction log and posted dividends. | [`app/dashboard/client/page.tsx`](../../app/dashboard/client/page.tsx) |
| [Your profile](../members.md) | `/dashboard/client/profile` | Member | Update your contact and next-of-kin details. | [`app/dashboard/client/profile/page.tsx`](../../app/dashboard/client/profile/page.tsx) |
| [Dividends](../investments.md) | `/dashboard/dividends` | Treasurer, Board, Administrator | Treasurer proposes/posts; Board decides; Administrator reviews. | [`app/dashboard/dividends/page.tsx`](../../app/dashboard/dividends/page.tsx) |
| [Member Earnings](../investments.md) | `/dashboard/earnings` | Treasurer, Board, Administrator | Calculate, review and post monthly shares of collected loan interest; Administrators set the member share. | [`app/dashboard/earnings/page.tsx`](../../app/dashboard/earnings/page.tsx) |
| [Investments](../investments.md) | `/dashboard/investments` | Everyone (see description) | Member-owned holdings/history; staff visibility; Administrator product and holding management. | [`app/dashboard/investments/page.tsx`](../../app/dashboard/investments/page.tsx) |
| [Loan application details](../loans.md) | `/dashboard/loans/{id}` | Everyone (see description) | Application ID: decisions, contract/signature, disbursement, then repayment workspace. Member ownership enforced. | [`app/dashboard/loans/[id]/page.tsx`](../../app/dashboard/loans/%5Bid%5D/page.tsx) |
| [Apply for a loan](../loans.md) | `/dashboard/loans/apply` | Member | Three-step form with eligibility preview and final review. | [`app/dashboard/loans/apply/page.tsx`](../../app/dashboard/loans/apply/page.tsx) |
| [Loans](../loans.md) | `/dashboard/loans` | Everyone (see description) | Own applications for Members; staff application queues, filters and exports. | [`app/dashboard/loans/page.tsx`](../../app/dashboard/loans/page.tsx) |
| [Dashboard redirect](../getting-started.md) | `/dashboard` | Everyone (see description) | Routes an authenticated user to their role's landing page. | [`app/dashboard/page.tsx`](../../app/dashboard/page.tsx) |
| [Member savings ledger](../savings.md) | `/dashboard/treasurer/members/{memberId}` | Treasurer | Open from Treasurer Desk; inspect history and record savings entries. | [`app/dashboard/treasurer/members/[memberId]/page.tsx`](../../app/dashboard/treasurer/members/%5BmemberId%5D/page.tsx) |
| [Treasurer Desk](../savings.md) | `/dashboard/treasurer` | Treasurer | Savings summaries, member withdrawal-request queue, member ledgers and deposit/withdrawal entry. | [`app/dashboard/treasurer/page.tsx`](../../app/dashboard/treasurer/page.tsx) |
| [Application handbook](../technical.md) | `/handbook` | Everyone (see description) | Renders the built docs/index.html. Outside the session proxy, so it opens without signing in. | [`app/handbook/page.tsx`](../../app/handbook/page.tsx) |
| [Entry point](../getting-started.md) | `/` | Everyone (see description) | Redirects to sign-in or the role dashboard. | [`app/page.tsx`](../../app/page.tsx) |
