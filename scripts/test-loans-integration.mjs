import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const connection = process.env.LOAN_TEST_DATABASE_URL;
if (!connection) {
  console.error(
    "Set LOAN_TEST_DATABASE_URL to a disposable local PostgreSQL database named hlusca_loans_test.",
  );
  process.exit(1);
}
const url = new URL(connection);
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.pathname !== "/hlusca_loans_test"
) {
  console.error(
    "Refusing to test against anything other than a local hlusca_loans_test database.",
  );
  process.exit(1);
}
const cwd = fileURLToPath(new URL("../", import.meta.url));
const env = {
  ...process.env,
  DATABASE_URL: connection,
  DATABASE_URL_UNPOOLED: connection,
};
for (const args of [
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "lib/loans/lifecycle.integration.test.ts",
  ],
]) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    env,
    stdio: "inherit",
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
