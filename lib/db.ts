import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { DATABASE_SCHEMA } from "./constants";
import { env } from "./env";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaAdapter: PrismaPg | undefined;
  var prismaPool: Pool | undefined;
}

// Keep each application process below the Neon pooler's connection allowance.
const pool =
  globalThis.prismaPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

const adapter =
  globalThis.prismaAdapter ??
  new PrismaPg(pool, {
    schema: DATABASE_SCHEMA,
  });

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    transactionOptions: {
      // Neon can need a few seconds to hand out a pooled connection after idle.
      maxWait: 15_000,
      timeout: 10_000,
    },
  });

if (env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
  globalThis.prismaAdapter = adapter;
  globalThis.prismaPool = pool;
}
