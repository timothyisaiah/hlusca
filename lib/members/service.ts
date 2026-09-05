import {
  AuditAction,
  NotificationType,
  PasswordResetChannel,
  Prisma,
  UserRole,
  UserStatus,
} from "@prisma/client";

import { ApiError, notFoundMessage } from "../api";
import { DATABASE_SCHEMA, SYSTEM_SETTING_KEYS } from "../constants";
import { prisma } from "../db";
import { runAuditedMutation } from "../audit/mutation";
import type { RequestMetadata } from "../audit/request";
import {
  assertE164Phone,
  normalizeEmail,
  normalizeUsername,
  resolveUserByIdentifier,
} from "../auth/identifiers";
import {
  assertStrongPassword,
  generateOtpCode,
  generateResetToken,
  generateTemporaryPassword,
  hashOpaqueToken,
  hashPassword,
  verifyPassword,
} from "../auth/passwords";
import { createNotification } from "../notifications/service";
import { ensureCoreSystemSettings, getNumberSetting } from "../system-settings";
import type {
  AdminMemberUpdateInput,
  ChangePasswordInput,
  MemberEnrollmentInput,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  SelfMemberUpdateInput,
} from "./schemas";

type AuditActor = {
  id: string;
  role: UserRole;
};

const memberProfileInclude = {
  user: {
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  savingsAccount: {
    select: {
      id: true,
      accountNumber: true,
      balance: true,
      status: true,
      openedAt: true,
    },
  },
} satisfies Prisma.MemberInclude;

export async function listMembers() {
  return prisma.member.findMany({
    orderBy: { createdAt: "desc" },
    include: memberProfileInclude,
  });
}

export async function getMemberById(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: memberProfileInclude,
  });

  if (!member) {
    throw new ApiError(notFoundMessage("member"), 404, "NOT_FOUND");
  }

  return member;
}

async function ensureUniqueIdentifiers(
  tx: Prisma.TransactionClient,
  input: {
    username?: string | null;
    email?: string | null;
    phone?: string | null;
  },
  excludeUserId?: string,
) {
  const checks = [
    input.username
      ? tx.user.findFirst({
          where: {
            username: input.username,
            NOT: excludeUserId ? { id: excludeUserId } : undefined,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    input.email
      ? tx.user.findFirst({
          where: {
            email: input.email,
            NOT: excludeUserId ? { id: excludeUserId } : undefined,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    input.phone
      ? tx.user.findFirst({
          where: {
            phone: input.phone,
            NOT: excludeUserId ? { id: excludeUserId } : undefined,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ];

  const [usernameConflict, emailConflict, phoneConflict] = await Promise.all(
    checks,
  );

  if (usernameConflict) {
    throw new ApiError(
      "That username is already in use.",
      409,
      "USERNAME_TAKEN",
    );
  }

  if (emailConflict) {
    throw new ApiError("That email is already in use.", 409, "EMAIL_TAKEN");
  }

  if (phoneConflict) {
    throw new ApiError("That phone is already in use.", 409, "PHONE_TAKEN");
  }
}

export function formatMemberNumber(sequence: number) {
  return `HLUSCA-${String(sequence).padStart(6, "0")}`;
}

function formatSavingsAccountNumber(memberNumber: string) {
  return `SAV-${memberNumber.replace("HLUSCA-", "")}`;
}

export async function issueMemberNumber(tx: Prisma.TransactionClient) {
  await ensureCoreSystemSettings(tx);

  const [row] = await tx.$queryRaw<{ value: string }[]>(Prisma.sql`
    UPDATE ${Prisma.raw(`"${DATABASE_SCHEMA}"."SystemSetting"`)}
    SET "value" = ((COALESCE(NULLIF("value", ''), '0'))::integer + 1)::text,
        "updatedAt" = NOW()
    WHERE "key" = ${SYSTEM_SETTING_KEYS.MEMBER_NUMBER_SEQUENCE}
    RETURNING "value"
  `);

  if (!row) {
    throw new ApiError(
      "Could not issue a member number.",
      500,
      "MEMBER_NUMBER_FAILED",
    );
  }

  const sequence = Number.parseInt(row.value, 10);

  if (!Number.isFinite(sequence)) {
    throw new ApiError(
      "The member number sequence is invalid.",
      500,
      "MEMBER_NUMBER_SEQUENCE_INVALID",
    );
  }

  return formatMemberNumber(sequence);
}

function getEnrollmentDeliveryMethod(phone: string | null) {
  return phone ? "SMS" : "IN_PERSON";
}

export async function enrollMember(
  input: MemberEnrollmentInput,
  actor: AuditActor,
  requestMeta: RequestMetadata,
) {
  const normalizedPhone = assertE164Phone(input.phone);
  const normalizedNextOfKinPhone = assertE164Phone(input.nextOfKinPhone);
  const normalizedEmail = input.email ? normalizeEmail(input.email) : null;
  const normalizedUsername = normalizeUsername(input.username);
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const deliveryMethod = getEnrollmentDeliveryMethod(normalizedPhone);

  return runAuditedMutation(
    {
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.CREATE,
      entityType: "Member",
      metadata: {
        username: normalizedUsername,
        deliveryMethod,
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    },
    async (tx) => {
      await ensureUniqueIdentifiers(tx, {
        username: normalizedUsername,
        email: normalizedEmail,
        phone: normalizedPhone,
      });

      const memberNumber = await issueMemberNumber(tx);
      const member = await tx.member.create({
        data: {
          memberNumber,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          dateOfBirth: input.dateOfBirth,
          nationalIdNumber: input.nationalIdNumber.trim(),
          address: input.address.trim(),
          phone: normalizedPhone,
          email: normalizedEmail,
          nextOfKinName: input.nextOfKinName.trim(),
          nextOfKinPhone: normalizedNextOfKinPhone,
          photoUrl: input.photoUrl?.trim(),
          status: "PENDING",
        },
      });

      const user = await tx.user.create({
        data: {
          username: normalizedUsername,
          email: normalizedEmail,
          phone: normalizedPhone,
          passwordHash,
          role: UserRole.CLIENT,
          memberId: member.id,
          status: UserStatus.ACTIVE,
          mustChangePassword: true,
          tempCredentialIssuedAt: new Date(),
        },
      });

      const savingsAccount = await tx.savingsAccount.create({
        data: {
          memberId: member.id,
          accountNumber: formatSavingsAccountNumber(memberNumber),
          balance: new Prisma.Decimal(0),
          status: "ACTIVE",
        },
      });

      await createNotification(
        {
          userId: user.id,
          type: NotificationType.WELCOME,
          message:
            deliveryMethod === "SMS"
              ? "A temporary password was issued for first-time sign-in."
              : "A temporary password must be handed to the member in person.",
        },
        tx,
      );

      return {
        result: {
          member: {
            ...member,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              phone: user.phone,
              role: user.role,
              status: user.status,
              mustChangePassword: user.mustChangePassword,
            },
            savingsAccount,
          },
          temporaryPassword,
          deliveryMethod,
        },
        entityId: member.id,
        afterState: {
          memberNumber,
          memberName: `${member.firstName} ${member.lastName}`,
          username: user.username,
          savingsAccountNumber: savingsAccount.accountNumber,
        },
      };
    },
  );
}

export async function updateMemberProfile(
  memberId: string,
  input: AdminMemberUpdateInput | SelfMemberUpdateInput,
  actor: AuditActor,
  requestMeta: RequestMetadata,
) {
  return runAuditedMutation(
    {
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.UPDATE,
      entityType: "Member",
      entityId: memberId,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    },
    async (tx) => {
      const existing = await tx.member.findUnique({
        where: { id: memberId },
        include: {
          user: true,
          savingsAccount: true,
        },
      });

      if (!existing) {
        throw new ApiError(notFoundMessage("member"), 404, "NOT_FOUND");
      }

      const nextUsername =
        "username" in input && input.username
          ? normalizeUsername(input.username)
          : existing.user?.username ?? null;
      const nextEmail =
        "email" in input
          ? input.email
            ? normalizeEmail(input.email)
            : null
          : existing.user?.email ?? null;
      const nextPhone =
        "phone" in input && input.phone
          ? assertE164Phone(input.phone)
          : existing.user?.phone ?? null;
      const nextRole =
        "role" in input && input.role
          ? input.role
          : existing.user?.role ?? null;

      if (
        existing.user &&
        existing.user.id === actor.id &&
        nextRole !== existing.user.role
      ) {
        throw new ApiError(
          "You cannot change your own system role.",
          400,
          "SELF_ROLE_CHANGE_FORBIDDEN",
        );
      }

      if (existing.user) {
        await ensureUniqueIdentifiers(
          tx,
          {
            username: nextUsername,
            email: nextEmail,
            phone: nextPhone,
          },
          existing.user.id,
        );
      }

      const updatedMember = await tx.member.update({
        where: { id: memberId },
        data: {
          firstName: "firstName" in input ? input.firstName?.trim() : undefined,
          lastName: "lastName" in input ? input.lastName?.trim() : undefined,
          address: input.address?.trim(),
          phone: nextPhone ?? undefined,
          email: nextEmail ?? undefined,
          nationalIdNumber:
            "nationalIdNumber" in input
              ? input.nationalIdNumber?.trim()
              : undefined,
          nextOfKinName: input.nextOfKinName?.trim(),
          nextOfKinPhone: input.nextOfKinPhone
            ? assertE164Phone(input.nextOfKinPhone)
            : undefined,
          dateOfBirth:
            "dateOfBirth" in input ? input.dateOfBirth ?? undefined : undefined,
          photoUrl: "photoUrl" in input ? input.photoUrl?.trim() : undefined,
          status: "status" in input ? input.status : undefined,
        },
        include: memberProfileInclude,
      });

      if (existing.user) {
        await tx.user.update({
          where: { id: existing.user.id },
          data: {
          username: nextUsername ?? undefined,
          email: nextEmail ?? undefined,
          phone: nextPhone ?? undefined,
          role: nextRole ?? undefined,
        },
      });
      }

      return {
        result: updatedMember,
        entityId: memberId,
        beforeState: {
          member: existing,
        },
        afterState: {
          member: updatedMember,
          systemRole: nextRole,
        },
      };
    },
  );
}

export async function requestPasswordReset(
  input: PasswordResetRequestInput,
  requestMeta: RequestMetadata,
) {
  const resolved = await resolveUserByIdentifier(prisma, input.identifier);

  if (!resolved) {
    await prisma.auditLog.create({
      data: {
        action: AuditAction.PASSWORD_RESET,
        entityType: "User",
        status: "FAILURE",
        failureReason: "No matching account.",
        metadata: {
          identifier: input.identifier,
        },
        ipAddress: requestMeta.ipAddress ?? undefined,
        userAgent: requestMeta.userAgent ?? undefined,
      },
    });

    return {
      channel: null,
      previewToken: null,
    };
  }

  const channel = resolved.user.email
    ? PasswordResetChannel.EMAIL
    : resolved.user.phone
      ? PasswordResetChannel.SMS
      : PasswordResetChannel.ADMIN_ASSISTED;
  const rawToken =
    channel === PasswordResetChannel.SMS
      ? generateOtpCode()
      : channel === PasswordResetChannel.EMAIL
        ? generateResetToken()
        : null;

  if (channel === PasswordResetChannel.ADMIN_ASSISTED || !rawToken) {
    await prisma.auditLog.create({
      data: {
        actorId: resolved.user.id,
        actorRole: resolved.user.role,
        action: AuditAction.PASSWORD_RESET,
        entityType: "User",
        entityId: resolved.user.id,
        status: "SUCCESS",
        metadata: {
          channel,
          identifierType: resolved.identifierType,
        },
        ipAddress: requestMeta.ipAddress ?? undefined,
        userAgent: requestMeta.userAgent ?? undefined,
      },
    });

    return {
      channel,
      previewToken: null,
    };
  }

  const tokenHash = hashOpaqueToken(rawToken);

  await runAuditedMutation(
    {
      actorId: resolved.user.id,
      actorRole: resolved.user.role,
      action: AuditAction.PASSWORD_RESET,
      entityType: "PasswordResetRequest",
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
      metadata: {
        channel,
        identifierType: resolved.identifierType,
      },
    },
    async (tx) => {
      const resetRequest = await tx.passwordResetRequest.create({
        data: {
          userId: resolved.user.id,
          identifierType: resolved.identifierType,
          channel,
          tokenHash,
          expiresAt: new Date(Date.now() + 1000 * 60 * 15),
        },
      });

      await createNotification(
        {
          userId: resolved.user.id,
          type: NotificationType.PASSWORD_RESET,
          message:
            channel === PasswordResetChannel.EMAIL
              ? "A password reset link token was generated."
              : "A password reset SMS code was generated.",
        },
        tx,
      );

      return {
        result: resetRequest,
        entityId: resetRequest.id,
        afterState: {
          channel,
          expiresAt: resetRequest.expiresAt,
        },
      };
    },
  );

  return {
    channel,
    previewToken: rawToken,
  };
}

export async function confirmPasswordReset(
  input: PasswordResetConfirmInput,
  requestMeta: RequestMetadata,
) {
  const resolved = await resolveUserByIdentifier(prisma, input.identifier);

  if (!resolved) {
    throw new ApiError("Invalid reset request.", 400, "INVALID_RESET_REQUEST");
  }

  assertStrongPassword(input.newPassword);
  const tokenHash = hashOpaqueToken(input.token);

  return runAuditedMutation(
    {
      actorId: resolved.user.id,
      actorRole: resolved.user.role,
      action: AuditAction.PASSWORD_CHANGE,
      entityType: "User",
      entityId: resolved.user.id,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    },
    async (tx) => {
      const resetRequest = await tx.passwordResetRequest.findFirst({
        where: {
          userId: resolved.user.id,
          tokenHash,
          consumedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!resetRequest) {
        throw new ApiError("Invalid or expired reset token.", 400, "TOKEN_INVALID");
      }

      const passwordHash = await hashPassword(input.newPassword);

      const updatedUser = await tx.user.update({
        where: { id: resolved.user.id },
        data: {
          passwordHash,
          mustChangePassword: false,
          tempCredentialIssuedAt: null,
        },
      });

      await tx.passwordResetRequest.update({
        where: { id: resetRequest.id },
        data: {
          consumedAt: new Date(),
        },
      });

      return {
        result: updatedUser,
        entityId: updatedUser.id,
        beforeState: {
          mustChangePassword: resolved.user.mustChangePassword,
        },
        afterState: {
          mustChangePassword: updatedUser.mustChangePassword,
          channel: resetRequest.channel,
        },
      };
    },
  );
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  requestMeta: RequestMetadata,
) {
  assertStrongPassword(input.newPassword);

  return runAuditedMutation(
    {
      actorId: userId,
      action: AuditAction.PASSWORD_CHANGE,
      entityType: "User",
      entityId: userId,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    },
    async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new ApiError(notFoundMessage("user"), 404, "NOT_FOUND");
      }

      const passwordMatches = await verifyPassword(
        input.currentPassword,
        user.passwordHash,
      );

      if (!passwordMatches) {
        throw new ApiError(
          "Your current password was incorrect.",
          400,
          "CURRENT_PASSWORD_INVALID",
        );
      }

      const passwordHash = await hashPassword(input.newPassword);

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          mustChangePassword: false,
          tempCredentialIssuedAt: null,
        },
      });

      await tx.passwordResetRequest.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      return {
        result: updatedUser,
        entityId: updatedUser.id,
        beforeState: {
          mustChangePassword: user.mustChangePassword,
        },
        afterState: {
          mustChangePassword: updatedUser.mustChangePassword,
        },
      };
    },
  );
}

export async function getClientDashboardSummary(memberId: string) {
  return prisma.member.findUnique({
    where: { id: memberId },
    include: memberProfileInclude,
  });
}

export async function getAdminOverview() {
  const [memberCount, pendingMemberCount, boardThreshold] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({
      where: {
        status: "PENDING",
      },
    }),
    getNumberSetting(SYSTEM_SETTING_KEYS.LOAN_BOARD_APPROVAL_THRESHOLD, 3_000_000),
  ]);

  return {
    memberCount,
    pendingMemberCount,
    boardThreshold,
  };
}

export async function getStaffDashboardSummary() {
  const [memberCount, activeCount, pendingCount] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.member.count({ where: { status: "PENDING" } }),
  ]);

  return {
    memberCount,
    activeCount,
    pendingCount,
  };
}
