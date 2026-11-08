import { describe, expect, it } from "vitest";
import { scoreClaim, similarity, type Signals } from "@/lib/business-verification";

const base: Signals = { venueName: "Bar Centrale", venueAddress: "Piazza Caduti per la Libertà 26", venueHasPhone: true, emailConfirmed: true };
const full: Signals = { ...base, emailOnVenueDomain: true, phoneCodeOk: true, distanceM: 12, vat: { valid: true, name: "CENTRALE DI ROSSI MARIO", address: "PIAZZA CADUTI PER LA LIBERTA 26 BRA CN" }, photo: { nameMatches: true, live: true, confidence: 0.9 } };

describe("business verification", () => {
  it("approves when every strong check passes", () => {
    expect(scoreClaim(full).decision).toBe("approved");
  });
  it("never approves without the phone code when the venue has a phone", () => {
    const d = scoreClaim({ ...full, phoneCodeOk: false });
    expect(d.decision).toBe("needs_more");
    expect(d.missing).toContain("codice al telefono del locale");
  });
  it("needs the confirmed email first", () => {
    expect(scoreClaim({ ...full, emailConfirmed: false }).decision).toBe("needs_more");
  });
  it("rejects an invalid VAT number or someone far from the venue", () => {
    expect(scoreClaim({ ...full, vat: { valid: false } }).decision).toBe("rejected");
    expect(scoreClaim({ ...full, distanceM: 4000 }).decision).toBe("rejected");
  });
  it("a venue without a public phone needs VAT, a live photo and presence together", () => {
    expect(scoreClaim({ ...full, venueHasPhone: false, phoneCodeOk: undefined }).decision).toBe("approved");
    expect(scoreClaim({ ...full, venueHasPhone: false, phoneCodeOk: undefined, photo: null }).decision).toBe("needs_more");
  });
  it("a photo of a screen or a different name is not enough", () => {
    expect(scoreClaim({ ...full, venueHasPhone: false, phoneCodeOk: undefined, photo: { nameMatches: true, live: false, confidence: 0.95 } }).decision).toBe("needs_more");
  });
  it("matches venue names loosely but not strangers", () => {
    expect(similarity("Bar Centrale", "CENTRALE DI ROSSI MARIO")).toBe(1);
    expect(similarity("Bar Centrale", "ALTRA SOCIETA SRL")).toBe(0);
  });
});
