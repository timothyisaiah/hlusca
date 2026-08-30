import { AuditAction, UserStatus } from "@prisma/client";
import type { AuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { prisma } from "../db";
import { env } from "../env";
import {
  detectIdentifierType,
  resolveUserByIdentifier,
} from "./identifiers";
import { verifyPassword } from "./passwords";

async function logLoginFailure(input: {
  identifier: string;
  identifierType: "MEMBER_NUMBER" | "USERNAME" | "EMAIL" | "PHONE";
  ipAddress?: string | null;
  userAgent?: string | null;
  userId?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.userId ?? undefined,
      action: AuditAction.LOGIN_FAILED,
      entityType: "User",
      entityId: input.userId ?? undefined,
      status: "FAILURE",
      failureReason: "Invalid credentials.",
      metadata: {
        identifier: input.identifier,
        identifierType: input.identifierType,
      },
      ipAddress: input.ipAddress ?? undefined,
      userAgent: input.userAgent ?? undefined,
    },
  });
}

async function logLoginSuccess(input: {
  userId: string;
  role: "CLIENT" | "TREASURER" | "BOARD" | "ADMIN";
  identifier: string;
  identifierType: "MEMBER_NUMBER" | "USERNAME" | "EMAIL" | "PHONE";
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: input.userId },
      data: { lastLoginAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorId: input.userId,
        actorRole: input.role,
        action: AuditAction.LOGIN,
        entityType: "User",
        entityId: input.userId,
        status: "SUCCESS",
        metadata: {
          identifier: input.identifier,
          identifierType: input.identifierType,
        },
        ipAddress: input.ipAddress ?? undefined,
        userAgent: input.userAgent ?? undefined,
      },
    }),
  ]);
}

export const authOptions: AuthOptions = {
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    CredentialsProvider({
      name: "HLUSCA Credentials",
      credentials: {
        identifier: {
          label: "Username, phone, email, or member number",
          type: "text",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials, req) {
        const identifier = credentials?.identifier?.trim() ?? "";
        const password = credentials?.password ?? "";
        const forwardedFor = req.headers?.["x-forwarded-for"];
        const ipAddress = Array.isArray(forwardedFor)
          ? forwardedFor[0]
          : forwardedFor?.split(",")[0]?.trim() ?? null;
        const userAgent = Array.isArray(req.headers?.["user-agent"])
          ? req.headers?.["user-agent"][0]
          : req.headers?.["user-agent"] ?? null;
        const attemptedIdentifierType = detectIdentifierType(identifier);

        if (!identifier || !password) {
          await logLoginFailure({
            identifier,
            identifierType: attemptedIdentifierType,
            ipAddress,
            userAgent,
          });
          return null;
        }

        const resolved = await resolveUserByIdentifier(prisma, identifier);

        if (!resolved) {
          await logLoginFailure({
            identifier,
            identifierType: attemptedIdentifierType,
            ipAddress,
            userAgent,
          });
          return null;
        }

        const passwordMatches = await verifyPassword(
          password,
          resolved.user.passwordHash,
        );

        if (!passwordMatches || resolved.user.status !== UserStatus.ACTIVE) {
          await logLoginFailure({
            identifier,
            identifierType: resolved.identifierType,
            ipAddress,
            userAgent,
            userId: resolved.user.id,
          });
          return null;
        }

        await logLoginSuccess({
          userId: resolved.user.id,
          role: resolved.user.role,
          identifier,
          identifierType: resolved.identifierType,
          ipAddress,
          userAgent,
        });

        return {
          id: resolved.user.id,
          name:
            resolved.member?.firstName && resolved.member?.lastName
              ? `${resolved.member.firstName} ${resolved.member.lastName}`
              : resolved.user.username ??
                resolved.user.email ??
                resolved.user.phone ??
                resolved.user.id,
          email: resolved.user.email,
          role: resolved.user.role,
          status: resolved.user.status,
          memberId: resolved.user.memberId,
          memberNumber: resolved.member?.memberNumber ?? null,
          mustChangePassword: resolved.user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.status = user.status;
        token.memberId = user.memberId;
        token.memberNumber = user.memberNumber;
        token.mustChangePassword = user.mustChangePassword;
      }

      return token;
    },
    async session({ session, token }) {
      if (!session.user || !token.sub || !token.role || !token.status) {
        return session;
      }

      session.user.id = token.sub;
      session.user.role = token.role;
      session.user.status = token.status;
      session.user.memberId = token.memberId ?? null;
      session.user.memberNumber = token.memberNumber ?? null;
      session.user.mustChangePassword = token.mustChangePassword ?? false;

      return session;
    },
  },
  events: {
    async signOut({ token }) {
      if (!token?.sub) {
        return;
      }

      await prisma.auditLog.create({
        data: {
          actorId: token.sub,
          actorRole: token.role,
          action: AuditAction.LOGOUT,
          entityType: "User",
          entityId: token.sub,
          status: "SUCCESS",
          metadata: {
            memberNumber: token.memberNumber ?? null,
          },
        },
      });
    },
  },
};

export const authHandler = NextAuth(authOptions);
