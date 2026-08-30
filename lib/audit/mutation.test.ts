import { beforeEach, describe, expect, it, vi } from "vitest";

const auditCreate = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: transaction,
    auditLog: {
      create: auditCreate,
    },
  },
}));

describe("runAuditedMutation", () => {
  beforeEach(() => {
    auditCreate.mockReset();
    transaction.mockReset();
  });

  it("writes a success audit entry inside the transaction", async () => {
    const { runAuditedMutation } = await import("@/lib/audit/mutation");

    transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        auditLog: {
          create: auditCreate,
        },
      }),
    );

    const result = await runAuditedMutation(
      {
        actorId: "user-1",
        action: "CREATE",
        entityType: "Member",
      },
      async () => ({
        result: "ok",
        entityId: "member-1",
      }),
    );

    expect(result).toBe("ok");
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SUCCESS",
          entityId: "member-1",
        }),
      }),
    );
  });

  it("writes a failure audit entry when the mutation throws", async () => {
    const { runAuditedMutation } = await import("@/lib/audit/mutation");

    transaction.mockImplementation(async () => {
      throw new Error("boom");
    });

    await expect(
      runAuditedMutation(
        {
          actorId: "user-1",
          action: "UPDATE",
          entityType: "Member",
        },
        async () => ({
          result: "never",
        }),
      ),
    ).rejects.toThrow("boom");

    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILURE",
          failureReason: "boom",
        }),
      }),
    );
  });
});
