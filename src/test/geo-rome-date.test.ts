import { describe, expect, it } from "vitest";
import { romeDate } from "@/lib/geo";

describe("daily menu refresh day boundary (Europe/Rome)", () => {
  it("23:30 UTC in summer is already the next day in Bra", () => {
    expect(romeDate(new Date("2026-07-10T23:30:00Z"))).toBe("2026-07-11");
  });
  it("21:00 UTC in summer is still the same day in Bra", () => {
    expect(romeDate(new Date("2026-07-10T21:00:00Z"))).toBe("2026-07-10");
  });
});
