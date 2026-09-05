import { describe, expect, it } from "vitest";
import { decodeSignature, sha256 } from "./signature";
import { signatureFixture } from "./test-fixtures";
import { signatureSchema } from "./schemas";

describe("signature evidence", () => {
  it("accepts a decodable PNG with ink and computes a stable digest", () => {
    const bytes = decodeSignature(signatureFixture());
    expect(sha256(bytes)).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256(bytes)).toBe(
      sha256(Buffer.from(signatureFixture().split(",")[1], "base64")),
    );
  });
  it("rejects an empty canvas, fake image, corrupt CRC and oversized upload", () => {
    expect(() => decodeSignature(signatureFixture(true))).toThrow(
      "Draw a clear signature",
    );
    expect(() => decodeSignature("data:image/png;base64,SGVsbG8=")).toThrow();
    const bytes = Buffer.from(signatureFixture().split(",")[1], "base64");
    bytes[40] ^= 1;
    expect(() =>
      decodeSignature(`data:image/png;base64,${bytes.toString("base64")}`),
    ).toThrow();
    expect(() =>
      decodeSignature(
        `data:image/png;base64,${Buffer.alloc(250001).toString("base64")}`,
      ),
    ).toThrow();
  });
  it("requires explicit consent, full name, image and the reviewed document hash", () => {
    const valid = {
      typedName: "Rose Ayo",
      signature: signatureFixture(),
      agree: true,
      documentHash: "a".repeat(64),
    };
    expect(signatureSchema.safeParse(valid).success).toBe(true);
    expect(signatureSchema.safeParse({ ...valid, agree: false }).success).toBe(
      false,
    );
    expect(
      signatureSchema.safeParse({ ...valid, documentHash: "" }).success,
    ).toBe(false);
  });
});
