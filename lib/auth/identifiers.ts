import type { Member, Prisma, User } from "@prisma/client";

import { ApiError } from "../api";
import { MEMBER_NUMBER_PATTERN } from "../constants";

type UserWithMember = Prisma.UserGetPayload<{
  include: { member: true };
}>;

interface DbLike {
  member: {
    findUnique: (args: Prisma.MemberFindUniqueArgs) => Promise<unknown>;
  };
  user: {
    findFirst: (args: Prisma.UserFindFirstArgs) => Promise<unknown>;
  };
}

export type IdentifierResolution =
  | {
      identifierType: "MEMBER_NUMBER" | "USERNAME" | "EMAIL" | "PHONE";
      user: UserWithMember;
      member: Member | null;
    }
  | null;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeMemberNumber(value: string) {
  return value.trim().toUpperCase();
}

export function normalizePhone(value: string) {
  const compact = value.replace(/[^\d+]/g, "");

  if (!compact) {
    return null;
  }

  const normalized = compact.startsWith("+") ? compact : `+${compact}`;

  if (!/^\+[1-9]\d{8,14}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export function assertE164Phone(value: string) {
  const normalized = normalizePhone(value);

  if (!normalized) {
    throw new ApiError(
      "Phone numbers must be in E.164 format, for example +256700123456.",
      400,
      "INVALID_PHONE",
    );
  }

  return normalized;
}

export function detectIdentifierType(value: string) {
  const trimmed = value.trim();

  if (MEMBER_NUMBER_PATTERN.test(normalizeMemberNumber(trimmed))) {
    return "MEMBER_NUMBER" as const;
  }

  if (trimmed.includes("@")) {
    return "EMAIL" as const;
  }

  if (normalizePhone(trimmed)) {
    return "PHONE" as const;
  }

  return "USERNAME" as const;
}

export async function resolveUserByIdentifier(
  client: DbLike,
  rawIdentifier: string,
): Promise<IdentifierResolution> {
  const memberNumber = normalizeMemberNumber(rawIdentifier);

  if (MEMBER_NUMBER_PATTERN.test(memberNumber)) {
    const member = await client.member.findUnique({
      where: { memberNumber },
      include: {
        user: {
          include: {
            member: true,
          },
        },
      },
    }) as (Member & {
      user:
        | (User & {
            member: Member | null;
          })
        | null;
    }) | null;

    if (member?.user) {
      return {
        identifierType: "MEMBER_NUMBER",
        user: member.user,
        member,
      };
    }
  }

  const username = normalizeUsername(rawIdentifier);
  const userByUsername = await client.user.findFirst({
    where: { username },
    include: { member: true },
  }) as UserWithMember | null;

  if (userByUsername) {
    return {
      identifierType: "USERNAME",
      user: userByUsername,
      member: userByUsername.member,
    };
  }

  const email = normalizeEmail(rawIdentifier);
  const userByEmail = await client.user.findFirst({
    where: { email },
    include: { member: true },
  }) as UserWithMember | null;

  if (userByEmail) {
    return {
      identifierType: "EMAIL",
      user: userByEmail,
      member: userByEmail.member,
    };
  }

  const phone = normalizePhone(rawIdentifier);

  if (phone) {
    const userByPhone = await client.user.findFirst({
      where: { phone },
      include: { member: true },
    }) as UserWithMember | null;

    if (userByPhone) {
      return {
        identifierType: "PHONE",
        user: userByPhone,
        member: userByPhone.member,
      };
    }
  }

  return null;
}

export type ResolvedUser = User;
