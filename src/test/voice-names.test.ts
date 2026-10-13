import { describe, expect, it } from "vitest";
import { ensureEnding, greetingWithName, nameLanguage, nameThenText, speechText } from "@/services/voice/text-speech";

describe("place names are pronounced in the right language", () => {
  it("monuments, churches and gardens are always Italian", () => {
    expect(nameLanguage("Palazzo Traversa", "monument")).toBe("it");
    expect(nameLanguage("Chiesa di San Pietro", "monument")).toBe("it");
    expect(nameLanguage("Harry's Garden", "tree")).toBe("it");
  });
  it("clearly foreign venue names keep their language", () => {
    expect(nameLanguage("Harry's Bar", "business")).toBe("en");
    expect(nameLanguage("Bistrot", "business")).toBe("fr");
    expect(nameLanguage("Chez Marie", "business")).toBe("fr");
    expect(nameLanguage("Zum Biergarten", "business")).toBe("de");
    expect(nameLanguage("Mesón del Toro", "business")).toBe("es");
    expect(nameLanguage("مطعم النخيل", "business")).toBe("ar");
  });
  it("Italian venue names stay Italian", () => {
    expect(nameLanguage("Boqueria", "business")).toBe("it");
    expect(nameLanguage("Bar della Stazione", "business")).toBe("it");
    expect(nameLanguage("Osteria La Pimpinella", "business")).toBe("it");
  });
  it("the name is spoken in its own language inside a sentence in another one", () => {
    expect(nameThenText("Palazzo Traversa", "Built long ago.", "en")).toEqual([
      { text: "Palazzo Traversa.", lang: "it" },
      { text: "Built long ago.", lang: "en" },
    ]);
    expect(nameThenText("Harry's Bar", "Aperto oggi.", "it", "en")).toEqual([
      { text: "Harry's Bar.", lang: "en" },
      { text: "Aperto oggi.", lang: "it" },
    ]);
    expect(nameThenText("Boqueria", "Aperto oggi.", "it")).toBe("Boqueria. Aperto oggi.");
    expect(greetingWithName("Benvenuto da §!", "Harry's Bar", "it", "Oggi pasta.", "en")).toEqual([
      { text: "Benvenuto da", lang: "it" },
      { text: "Harry's Bar", lang: "en" },
      { text: "! Oggi pasta.", lang: "it" },
    ]);
  });
});

describe("Italian double consonants are never cut", () => {
  it("every sentence ends with punctuation so the last syllable is spoken", () => {
    expect(ensureEnding("Una birra")).toBe("Una birra.");
    expect(ensureEnding("Una birra.")).toBe("Una birra.");
    expect(ensureEnding("Che bella mamma!")).toBe("Che bella mamma!");
  });
  it("the text clean-up never removes a doubled letter", () => {
    const t = speechText("Una birra, un caffè, una panna cotta e la mamma di Bra.");
    for (const w of ["birra", "caffè", "panna", "mamma"]) expect(t).toContain(w);
  });
});
