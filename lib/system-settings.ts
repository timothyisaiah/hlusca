import type { PrismaClient, Prisma, SystemSetting } from "@prisma/client";

import { prisma } from "./db";
import { SYSTEM_SETTING_KEYS } from "./constants";

type DbLike = PrismaClient | Prisma.TransactionClient;

export async function ensureCoreSystemSettings(client: DbLike = prisma) {
  await client.systemSetting.upsert({
    where: { key: SYSTEM_SETTING_KEYS.LOAN_BOARD_APPROVAL_THRESHOLD },
    update: {},
    create: {
      key: SYSTEM_SETTING_KEYS.LOAN_BOARD_APPROVAL_THRESHOLD,
      value: "3000000",
    },
  });

  await client.systemSetting.upsert({
    where: { key: SYSTEM_SETTING_KEYS.MEMBER_NUMBER_SEQUENCE },
    update: {},
    create: {
      key: SYSTEM_SETTING_KEYS.MEMBER_NUMBER_SEQUENCE,
      value: "0",
    },
  });
}

export async function getSystemSetting(
  key: string,
  fallback?: string,
  client: DbLike = prisma,
) {
  const setting = await client.systemSetting.findUnique({
    where: { key },
  });

  return setting?.value ?? fallback ?? null;
}

export async function getNumberSetting(
  key: string,
  fallback: number,
  client: DbLike = prisma,
) {
  const value = await getSystemSetting(key, String(fallback), client);
  const parsed = Number.parseInt(value ?? String(fallback), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function setSystemSetting(
  key: string,
  value: string,
  updatedById?: string | null,
  client: DbLike = prisma,
) {
  return client.systemSetting.upsert({
    where: { key },
    update: {
      value,
      updatedById: updatedById ?? undefined,
    },
    create: {
      key,
      value,
      updatedById: updatedById ?? undefined,
    },
  });
}

export function isSystemSettingKey(value: string): value is keyof typeof SYSTEM_SETTING_KEYS {
  return value in SYSTEM_SETTING_KEYS;
}

export type SystemSettingRecord = SystemSetting;
