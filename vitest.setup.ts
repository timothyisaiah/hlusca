Object.assign(process.env, {
  NODE_ENV: process.env.NODE_ENV ?? "test",
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5432/hlusca_test",
  DATABASE_URL_UNPOOLED:
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5432/hlusca_test",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://127.0.0.1:3000",
  AUTH_SECRET:
    process.env.AUTH_SECRET ?? "vitest-auth-secret-for-hlusca-foundation-tests",
});
