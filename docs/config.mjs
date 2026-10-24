// Every application source must belong to at least one review group. Prefixes
// ending in / include new files automatically; other entries are exact paths.
export const groups = {
  access: { title: "Getting started", file: "getting-started.md", audience: "everyone", sources: ["app/(auth)/", "app/page.tsx", "app/layout.tsx", "app/dashboard/layout.tsx", "app/dashboard/page.tsx", "lib/auth/", "lib/dashboard/", "lib/constants.ts", "proxy.ts", "components/layout/", "components/forms/login-form.tsx", "components/forms/change-password-form.tsx", "components/forms/forgot-password-form.tsx", "app/api/auth/", "types/"] },
  members: { title: "Members and administration", file: "members.md", audience: "ADMIN CLIENT", sources: ["app/dashboard/admin/", "app/dashboard/client/profile/", "app/api/members/", "lib/members/", "components/forms/enroll-member-form.tsx", "components/forms/member-profile-form.tsx", "components/tables/members-table.tsx"] },
  savings: { title: "Savings and ledgers", file: "savings.md", audience: "CLIENT TREASURER", sources: ["app/dashboard/client/page.tsx", "app/dashboard/treasurer/", "app/api/savings/", "app/api/withdrawal-requests/", "app/api/members/", "lib/savings/", "components/savings/", "components/forms/savings-transaction-form.tsx", "lib/pdf/transaction-ledger.ts"] },
  loans: { title: "Loans and repayments", file: "loans.md", audience: "everyone", sources: ["app/dashboard/loans/", "app/dashboard/admin/loan-types/", "app/api/loan", "app/api/contracts/", "app/api/cron/", "lib/loans/", "lib/pdf/loan-contract.ts", "components/loans/"] },
  investments: { title: "Investments and dividends", file: "investments.md", audience: "everyone", sources: ["app/dashboard/investments/", "app/dashboard/dividends/", "app/dashboard/client/page.tsx", "app/api/investment-products/", "app/api/investments/", "app/api/dividend-runs/", "app/api/dividend-history/", "lib/investments/", "components/investments/", "app/dashboard/earnings/", "app/api/earnings-runs/", "app/api/earnings-history/", "app/api/earnings-settings/", "lib/earnings/", "components/earnings/"] },
  technical: { title: "Architecture and operations", file: "technical.md", audience: "technical", sources: ["app/dashboard/board/", "app/globals.css", "app/favicon.ico", "lib/api.ts", "lib/audit/", "lib/db.ts", "lib/db-serialize.ts", "lib/db-serialize.test.ts", "lib/env.ts", "app/handbook/", "app/api/handbook/", "lib/system-settings.ts", "lib/utils.ts", "lib/notifications/", "lib/pdf/index.ts", "components/ui/", "components/tables/responsive-data-list.tsx", "prisma/", "prisma.config.ts", "next.config.ts", "jobs/", "scripts/", "package.json", "package-lock.json", "tsconfig.json", "vitest.config.ts", "eslint.config.mjs", "postcss.config.mjs", "vercel.json", ".github/", "README.md", "agent.md", "AGENTS.md"] },
};

// An explicit prefix for the loan API families avoids treating an ordinary
// exact filename as a wildcard.
groups.loans.sources = groups.loans.sources.filter((p) => p !== "app/api/loan").concat([
  "app/api/loan-applications/", "app/api/loan-types/", "app/api/loan-settings/", "app/api/loans/",
]);

export const sections = [
  { id: "welcome", title: "Start here", file: "overview.md", audience: "everyone" },
  ...Object.entries(groups).filter(([id]) => id !== "technical").map(([id, value]) => ({ id, ...value })),
  { id: "navigation", title: "Screen directory", file: "generated/navigation.md", audience: "everyone" },
  { id: "actions", title: "Action matrix", file: "generated/actions.md", audience: "everyone" },
  { id: "api", title: "API conventions", file: "api.md", audience: "technical" },
  { id: "endpoints", title: "Endpoint reference", file: "generated/endpoints.md", audience: "technical" },
  { id: "validation", title: "Validation reference", file: "generated/validation.md", audience: "technical" },
  { id: "technical", ...groups.technical },
  { id: "data", title: "Data dictionary", file: "generated/data.md", audience: "technical" },
  { id: "maintenance", title: "Maintain this handbook", file: "maintenance.md", audience: "technical" },
];

export const trackedRoots = ["app", "components", "lib", "prisma", "jobs", "scripts", "types", ".github"];
export const trackedFiles = ["package.json", "package-lock.json", "prisma.config.ts", "next.config.ts", "tsconfig.json", "vitest.config.ts", "eslint.config.mjs", "postcss.config.mjs", "vercel.json", "README.md", "agent.md", "AGENTS.md", "proxy.ts"];
