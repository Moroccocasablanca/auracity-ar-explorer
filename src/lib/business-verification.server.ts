// Server-only helpers of the automatic venue check: EU VAT lookup and the AI reading of the live photo.

/** Looks the Italian VAT number (partita IVA) up in the EU VIES register: is it valid, and under which name and address. */
export async function checkVat(vat: string): Promise<{ valid: boolean; name?: string | undefined; address?: string | undefined } | null> {
  const n = vat.replace(/\s/g, "").replace(/^IT/i, "");
  if (!/^\d{11}$/.test(n)) return { valid: false };
  try {
    const r = await fetch(`https://ec.europa.eu/taxation_customs/vies/rest-api/ms/IT/vat/${n}`, { signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return null; // the register is busy: try again later, never "valid" by default
    const j = (await r.json()) as { isValid?: boolean; name?: string; address?: string };
    const clean = (x?: string) => (x && x !== "---" ? x.replace(/\s+/g, " ").trim() : undefined);
    return { valid: j.isValid === true, name: clean(j.name), address: clean(j.address) };
  } catch {
    return null;
  }
}

/** The AI reads a live photo: is it a real photo of a shop sign or a menu, and does the written name match the venue? */
export async function readVenuePhoto(imageBase64: string, mime: string, venueName: string, key: string): Promise<{ nameMatches: boolean; live: boolean; confidence: number } | null> {
  const prompt = `Questa è una foto scattata ora con la fotocamera davanti a un locale. Il locale dovrebbe chiamarsi "${venueName}".
Rispondi in JSON: "readText" (il testo dell'insegna o del menu che si legge), "nameMatches" (true solo se il nome del locale si legge chiaramente nella foto), "live" (true se sembra una foto vera fatta sul posto e NON uno screenshot, uno schermo fotografato o una stampa), "confidence" (da 0 a 1).`;
  for (const model of ["gemini-3.5-flash", "gemini-3.1-flash-lite"]) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: mime, data: imageBase64 } }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0, responseSchema: { type: "OBJECT", properties: { readText: { type: "STRING" }, nameMatches: { type: "BOOLEAN" }, live: { type: "BOOLEAN" }, confidence: { type: "NUMBER" } }, required: ["nameMatches", "live", "confidence"] } },
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!r.ok) continue;
      const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const o = JSON.parse(j.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}") as { nameMatches?: boolean; live?: boolean; confidence?: number };
      return { nameMatches: o.nameMatches === true, live: o.live === true, confidence: Math.min(1, Math.max(0, Number(o.confidence) || 0)) };
    } catch { /* next model */ }
  }
  return null;
}
