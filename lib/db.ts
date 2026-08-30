import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { DATABASE_SCHEMA } from "./constants";
import { env } from "./env";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaAdapter: PrismaPg | undefined;
}

const adapter =
  globalThis.prismaAdapter ??
  new PrismaPg(env.DATABASE_URL, {
    schema: DATABASE_SCHEMA,
  });

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
  globalThis.prismaAdapter = adapter;
}
