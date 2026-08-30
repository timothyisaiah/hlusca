import { describe, expect, it, vi } from "vitest";

import {
  detectIdentifierType,
  normalizePhone,
  resolveUserByIdentifier,
} from "@/lib/auth/identifiers";

function buildClient() {
  return {
    member: {
      findUnique: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  };
}

describe("identifier helpers", () => {
  it("detects member numbers before other identifier classes", () => {
    expect(detectIdentifierType("hlusca-000123")).toBe("MEMBER_NUMBER");
  });

  it("normalizes E.164-style phone input", () => {
    expect(normalizePhone("256700123456")).toBe("+256700123456");
    expect(normalizePhone("+256 700 123 456")).toBe("+256700123456");
    expect(normalizePhone("+256778576892")).toBe("+256778576892");
  });

  it("resolves member number before username, email, or phone", async () => {
    const client = buildClient();
    client.member.findUnique.mockResolvedValue({
      id: "member-1",
      memberNumber: "HLUSCA-000001",
      user: {
        id: "user-1",
        username: "rose",
        email: "rose@example.com",
        phone: "+256700123456",
        passwordHash: "hash",
        role: "CLIENT",
        status: "ACTIVE",
        mustChangePassword: false,
        memberId: "member-1",
        member: {
          id: "member-1",
          memberNumber: "HLUSCA-000001",
        },
      },
    });

    const result = await resolveUserByIdentifier(client, "hlusca-000001");

    expect(result?.identifierType).toBe("MEMBER_NUMBER");
    expect(client.user.findFirst).not.toHaveBeenCalled();
  });
});
