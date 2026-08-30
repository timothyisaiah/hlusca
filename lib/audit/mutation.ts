import type { AuditAction, Prisma, UserRole } from "@prisma/client";

import { prisma } from "../db";

interface MutationContext {
  actorId?: string | null;
  actorRole?: UserRole | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface MutationOutcome<T> {
  result: T;
  entityId?: string | null;
  beforeState?: Prisma.InputJsonValue | null;
  afterState?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
}

type MutationExecutor<T> = (
  tx: Prisma.TransactionClient,
) => Promise<MutationOutcome<T>>;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function runAuditedMutation<T>(
  context: MutationContext,
  execute: MutationExecutor<T>,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const outcome = await execute(tx);

      await tx.auditLog.create({
        data: {
          actorId: context.actorId ?? undefined,
          actorRole: context.actorRole ?? undefined,
          action: context.action,
          entityType: context.entityType,
          entityId: outcome.entityId ?? context.entityId ?? undefined,
          beforeState: outcome.beforeState ?? undefined,
          afterState: outcome.afterState ?? undefined,
          metadata: outcome.metadata ?? context.metadata ?? undefined,
          ipAddress: context.ipAddress ?? undefined,
          userAgent: context.userAgent ?? undefined,
          status: "SUCCESS",
        },
      });

      return outcome.result;
    });
  } catch (error) {
    await prisma.auditLog.create({
      data: {
        actorId: context.actorId ?? undefined,
        actorRole: context.actorRole ?? undefined,
        action: context.action,
        entityType: context.entityType,
        entityId: context.entityId ?? undefined,
        metadata: context.metadata ?? undefined,
        ipAddress: context.ipAddress ?? undefined,
        userAgent: context.userAgent ?? undefined,
        status: "FAILURE",
        failureReason: getErrorMessage(error),
      },
    });

    throw error;
  }
}
