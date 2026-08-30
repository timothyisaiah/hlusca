import type { UserRole, UserStatus } from "@prisma/client";
import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      status: UserStatus;
      memberId: string | null;
      memberNumber: string | null;
      mustChangePassword: boolean;
    };
  }

  interface User extends DefaultUser {
    role: UserRole;
    status: UserStatus;
    memberId: string | null;
    memberNumber: string | null;
    mustChangePassword: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    status?: UserStatus;
    memberId?: string | null;
    memberNumber?: string | null;
    mustChangePassword?: boolean;
  }
}
