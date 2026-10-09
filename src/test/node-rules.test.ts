import { describe, expect, it } from "vitest";
import { allowsMessages, isGardenObject } from "@/lib/node-rules";

describe("protected places", () => {
  for (const kind of ["monument", "church", "mosque", "house", "school", "street", "service"]) {
    it(`${kind} remains information-only even if flagged`, () => {
      expect(allowsMessages({ kind, garden_interactive: true })).toBe(false);
      expect(isGardenObject({ kind, garden_interactive: true })).toBe(false);
    });
  }
  it("only explicitly identified garden benches and trees can animate", () => {
    expect(isGardenObject({ kind: "bench", garden_interactive: true })).toBe(true);
    expect(isGardenObject({ kind: "tree", garden_interactive: true })).toBe(true);
    expect(isGardenObject({ kind: "bench", garden_interactive: false })).toBe(false);
    expect(isGardenObject({ kind: "tree" })).toBe(false);
  });
});