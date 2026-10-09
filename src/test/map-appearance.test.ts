import { describe, expect, it } from "vitest";
import { braMapAppearance, resolveMapAppearance } from "@/lib/map-appearance";

describe("live Bra day/night map", () => {
  it("uses daytime at Bra in daylight", () => expect(braMapAppearance(new Date("2026-10-09T12:00:00Z"))).toBe("day"));
  it("uses nighttime at Bra at 21:23 Rome", () => expect(braMapAppearance(new Date("2026-10-09T19:23:00Z"))).toBe("night"));
  it("respects a manual daytime selection at night", () => expect(resolveMapAppearance("day", new Date("2026-10-09T19:23:00Z"))).toBe("day"));
  it("respects a manual nighttime selection at noon", () => expect(resolveMapAppearance("night", new Date("2026-10-09T12:00:00Z"))).toBe("night"));
});