import { describe, expect, it } from "vitest";

import {
  adminMemberUpdateSchema,
  memberEnrollmentSchema,
} from "@/lib/members/schemas";

describe("member enrollment schema", () => {
  it("accepts a city-only address and valid Ugandan E.164 numbers", () => {
    const result = memberEnrollmentSchema.parse({
      firstName: "Timothy",
      lastName: "Ateesa",
      username: "timothyisaiah",
      phone: "+256778576892",
      email: "timothyisaiah7@gmail.com",
      address: "Kampala",
      nationalIdNumber: "CM96007102GTCK",
      nextOfKinName: "Patricia Mirembe",
      nextOfKinPhone: "+256776476000",
      dateOfBirth: "",
      photoUrl: "",
    });

    expect(result.address).toBe("Kampala");
    expect(result.phone).toBe("+256778576892");
  });

  it("accepts only supported system roles for administrator updates", () => {
    expect(adminMemberUpdateSchema.parse({ role: "TREASURER" }).role).toBe(
      "TREASURER",
    );
    expect(
      adminMemberUpdateSchema.safeParse({ role: "SUPERVISOR" }).success,
    ).toBe(false);
  });
});
