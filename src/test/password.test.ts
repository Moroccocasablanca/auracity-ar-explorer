import { describe, expect, it } from "vitest";
import { isStrongPassword } from "@/lib/password";

describe("strong password policy", () => {
  it("accepts 10+ chars with upper, lower, digit and symbol", () => {
    expect(isStrongPassword("Sicura!Pass26")).toBe(true);
  });
  it("rejects passwords shorter than 10 characters", () => {
    expect(isStrongPassword("Ab1!xyz9")).toBe(false);
  });
  it("rejects passwords without a symbol", () => {
    expect(isStrongPassword("SicuraPass2026")).toBe(false);
  });
  it("rejects passwords without a digit", () => {
    expect(isStrongPassword("Sicura!Password")).toBe(false);
  });
  it("rejects passwords without an uppercase letter", () => {
    expect(isStrongPassword("sicura!pass2026")).toBe(false);
  });
});
