import type { NotificationType, Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../db";

type DbLike = PrismaClient | Prisma.TransactionClient;

export async function createNotification(
  input: {
    userId: string;
    type: NotificationType;
    message: string;
  },
  client: DbLike = prisma,
) {
  return client.notification.create({
    data: input,
  });
}
