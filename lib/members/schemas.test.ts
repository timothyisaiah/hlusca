import { describe, expect, it } from "vitest";

import { memberEnrollmentSchema } from "@/lib/members/schemas";

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
});
