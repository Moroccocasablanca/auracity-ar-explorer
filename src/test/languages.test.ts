import { describe, expect, it } from "vitest";
import { detectLang, translate } from "@/lib/i18n";
import { isGardenObject } from "@/lib/node-rules";

describe("app language follows the phone", () => {
  it("picks Spanish for an es-ES phone", () => expect(detectLang(["es-ES", "en"])).toBe("es"));
  it("picks Arabic for an ar phone", () => expect(detectLang(["ar-MA"])).toBe("ar"));
  it("skips unsupported languages to the next preferred one", () => expect(detectLang(["ja-JP", "fr-FR"])).toBe("fr"));
  it("falls back to English when nothing is supported", () => expect(detectLang(["ja-JP"])).toBe("en"));
  it("has a meetup block message in Italian", () => expect(translate("it", "err.meetup")).toContain("appuntamenti"));
});

describe("talking garden objects", () => {
  it("a garden tree can talk", () => expect(isGardenObject({ kind: "tree", garden_interactive: true })).toBe(true));
  it("a monument never talks user messages", () => expect(isGardenObject({ kind: "monument", garden_interactive: true })).toBe(false));
});
