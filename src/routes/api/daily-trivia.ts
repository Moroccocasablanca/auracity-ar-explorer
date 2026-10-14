// Fresh quiz questions every day, written by AI once per day and kept on the server (nothing to do by hand).
// Needs GEMINI_API_KEY on the server (locally: ~/.auracity-gemini-key). If the AI is busy or has no quota, the app keeps using its own question bank.
import { createFileRoute } from "@tanstack/react-router";

const MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]; // fastest ones that answer for our key (checked 2026-10-13)
const TOPICS = ["italiano", "english", "storia", "geografia", "scienze", "mate", "arte", "civica", "modi", "locale"];
const inflight = new Map<string, Promise<unknown[]>>();

type Raw = { band?: string; topic?: string; q?: string; options?: unknown; why?: string };

function clean(list: Raw[], day: string) {
  const out: { id: string; topic: string; bands: string[]; q: string; options: string[]; ok: number; why: string; ai: true }[] = [];
  for (const r of list) {
    const options = Array.isArray(r.options) ? r.options.map((o) => String(o).trim()).filter(Boolean) : [];
    if (!r.q || !r.why || options.length < 3 || new Set(options.map((o) => o.toLowerCase())).size !== options.length) continue;
    const band = r.band === "kids" || r.band === "teen" || r.band === "adult" ? r.band : "adult";
    const topic = TOPICS.includes(String(r.topic)) ? String(r.topic) : "scienze";
    // kids' questions are also fine for teens; teen ones for adults too
    const bands = band === "kids" ? ["kids", "teen"] : band === "teen" ? ["teen", "adult"] : ["adult"];
    out.push({ id: `ai-${day}-${Math.random().toString(36).slice(2, 7)}-${out.length}`, topic, bands, q: r.q.trim(), options: options.slice(0, 4), ok: 0, why: r.why.trim(), ai: true });
  }
  return out;
}

async function generate(key: string, day: string, focus?: { topic: string; band: string }) {
  const prompt = focus
    ? `Oggi è ${day}. Scrivi 10 NUOVE domande a scelta multipla in italiano per un'app di quiz educativa e divertente. Materia: ${focus.topic} (${focus.topic === "english" ? "come si dice in inglese, falsi amici, frasi utili" : focus.topic === "modi" ? "modi di dire italiani" : focus.topic === "locale" ? "Piemonte, Langhe, Bra, cibo e vino" : "programma scolastico italiano"}). Livello: ${focus.band === "kids" ? "bambini 8-11 anni" : focus.band === "teen" ? "ragazzi delle scuole medie e superiori" : "adulti"}. Ogni domanda su un argomento DIVERSO dentro la materia (non ripetere gli stessi temi). Regole: SOLO fatti certi e verificabili; 4 risposte diverse, la PRIMA è sempre quella giusta; spiegazione di 1-2 frasi che insegna qualcosa; tono chiaro e simpatico. Campi: band="${focus.band}", topic="${focus.topic}".`
    : `Oggi è ${day}. Scrivi 18 domande a scelta multipla in italiano per un'app di quiz educativa e divertente: 6 per bambini (8-11 anni, "kids"), 6 per ragazzi delle scuole medie e superiori ("teen"), 6 per adulti ("adult").
Varia le materie tra: ${TOPICS.join(", ")} (english = come si dice in inglese, falsi amici, frasi utili; modi = modi di dire italiani; locale = Piemonte, Langhe, Bra, cibo e vino).
Regole: SOLO fatti certi e verificabili (niente dubbi, niente notizie recenti); 4 risposte diverse, la PRIMA è sempre quella giusta; spiegazione di 1-2 frasi che insegna qualcosa; tono chiaro e simpatico; nessuna domanda che dipende dalla data odierna.`;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": key, "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: { band: { type: "STRING" }, topic: { type: "STRING" }, q: { type: "STRING" }, options: { type: "ARRAY", items: { type: "STRING" } }, why: { type: "STRING" } },
                  required: ["band", "topic", "q", "options", "why"],
                },
              },
            },
          }),
        });
        const j = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
        if (res.ok && text) {
          const list = clean(JSON.parse(text) as Raw[], day);
          if (list.length >= 6) return list;
        }
      } catch {
        /* try again */
      }
      await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
    }
  }
  return [];
}

export const Route = createFileRoute("/api/daily-trivia")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const os = await import("node:os");
        const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
        const dir = path.join(process.cwd(), ".daily-cache");
        const url = new URL(request.url);
        const topic = url.searchParams.get("topic") ?? "";
        const band = url.searchParams.get("band") ?? "";
        const focus = TOPICS.includes(topic) && ["kids", "teen", "adult"].includes(band) ? { topic, band } : undefined;
        const file = path.join(dir, focus ? `trivia-${day}-${band}-${topic}.json` : `trivia-${day}.json`);
        if (fs.existsSync(file)) return new Response(fs.readFileSync(file), { headers: { "content-type": "application/json", "cache-control": "public, max-age=600" } });
        let key = process.env["GEMINI_API_KEY"] ?? "";
        if (!key) {
          try { key = fs.readFileSync(path.join(os.homedir(), ".auracity-gemini-key"), "utf8").replace(/\s/g, ""); } catch { /* none */ }
        }
        if (!key) return Response.json([], { status: 503 });
        // Writing 18 questions takes a while: answer at once ("not ready yet") and let it finish in the background.
        const slot = focus ? `${band}-${topic}` : "daily";
        if (!inflight.has(slot)) {
          inflight.set(slot, generate(key, day, focus)
            .then((list) => {
              if (list.length) {
                fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(file, JSON.stringify(list));
              }
              return list;
            })
            .finally(() => { setTimeout(() => inflight.delete(slot), 120_000); }));
        }
        return Response.json([], { status: 202 });
      },
    },
  },
});
