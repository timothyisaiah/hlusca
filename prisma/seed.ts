import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole, UserStatus } from "@prisma/client";

import {
  DATABASE_SCHEMA,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
  SYSTEM_SETTING_KEYS,
} from "../lib/constants";
import { hashPassword } from "../lib/auth/passwords";

function loadEnvFile(fileName: string) {
  const filePath = resolve(process.cwd(), fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("No database connection string was found for seeding.");
}

const adapter = new PrismaPg(connectionString, {
  schema: DATABASE_SCHEMA,
});

const prisma = new PrismaClient({
  adapter,
});

async function seedSystemSettings() {
  await prisma.systemSetting.upsert({
    where: { key: SYSTEM_SETTING_KEYS.LOAN_BOARD_APPROVAL_THRESHOLD },
    update: {},
    create: {
      key: SYSTEM_SETTING_KEYS.LOAN_BOARD_APPROVAL_THRESHOLD,
      value: "3000000",
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: SYSTEM_SETTING_KEYS.MEMBER_NUMBER_SEQUENCE },
    update: {},
    create: {
      key: SYSTEM_SETTING_KEYS.MEMBER_NUMBER_SEQUENCE,
      value: "0",
    },
  });
}

async function seedAdminUser() {
  const username = process.env.SEED_ADMIN_USERNAME ?? DEFAULT_ADMIN_USERNAME;
  const email = process.env.SEED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;

  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { id: "hlusca-seed-admin" },
    update: {
      username,
      email,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      mustChangePassword: true,
      tempCredentialIssuedAt: new Date(),
    },
    create: {
      id: "hlusca-seed-admin",
      username,
      email,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      mustChangePassword: true,
      tempCredentialIssuedAt: new Date(),
    },
  });
}

async function main() {
  await seedSystemSettings();
  await seedAdminUser();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
