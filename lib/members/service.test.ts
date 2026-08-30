import { describe, expect, it } from "vitest";

import { formatMemberNumber } from "@/lib/members/service";

describe("member number generator", () => {
  it("formats the human-facing identifier with zero padding", () => {
    expect(formatMemberNumber(1)).toBe("HLUSCA-000001");
    expect(formatMemberNumber(147)).toBe("HLUSCA-000147");
  });
});
