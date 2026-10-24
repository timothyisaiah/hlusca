import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { DATABASE_SCHEMA } from "./constants";
import { serializeClientQueries } from "./db-serialize";
import { env } from "./env";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaAdapter: PrismaPg | undefined;
  var prismaPool: Pool | undefined;
}

function createPool() {
  // Keep each application process below the Neon pooler's connection allowance.
  const created = new Pool({
    connectionString: env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  // Fires once per new connection, before it is handed out; see db-serialize.
  created.on("connect", (client) => serializeClientQueries(client));
  return created;
}

const pool = globalThis.prismaPool ?? createPool();

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
