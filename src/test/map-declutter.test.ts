import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The user asked many times: map icons must NEVER pile up on top of each other.
// Tidied markers get the class `aura-mk-off`; the map writes its own inline opacity on every marker, so the hiding rule must be !important.
describe("map markers never pile up", () => {
  const css = readFileSync("src/styles.css", "utf8");
  const src = readFileSync("src/components/map/BraMap.tsx", "utf8");

  it("hides tidied markers even against the map's inline opacity", () => {
    expect(css).toMatch(/\.aura-mk\.aura-mk-off\s*{[^}]*opacity:\s*0\s*!important/);
  });

  it("tidies again after the markers change (filters, services), not only after the map moves", () => {
    expect(src).toContain("const scheduleDeclutter");
    // used after the nodes effect and after the points-of-interest effect, and on every map movement
    expect(src.match(/scheduleDeclutter\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });
});
