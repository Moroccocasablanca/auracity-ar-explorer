// What the talking trees and benches say changes EVERY day: a new greeting and a new riddle / joke / curiosity for each one.
// The AI writes the day's lines once (never repeating yesterday's) and keeps them on the server; the voice of the first lines
// is prepared in the background, so the first child to tap does not wait. Needs GEMINI_API_KEY (locally ~/.auracity-gemini-key).
import { createFileRoute } from "@tanstack/react-router";
import { partsForSpeech } from "@/services/voice/text-speech";
import { cleanCheck } from "@/lib/clean-text";

const MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
const PER_KIND = 24;
const PREWARM = 80; // every talking tree and bench: with the free fallback voice there is no quota to save
const TYPES = ["indovinello (con la risposta alla fine)", "barzelletta per bambini", "curiosità sugli animali", "curiosità sugli alberi e le piante", "mini sfida sicura da fare subito qui", "il fatto strano del corpo umano", "domanda 'Sapevi che…?' sullo spazio", "filastrocca di 4 versi", "indovina il numero o il colore (gioco veloce)", "curiosità sull'acqua, il cielo o il meteo"];

// What nature and the sky are doing in each month: the lines follow the real calendar, so a child hears something new AND true for the season.
const SEASON = ["inverno: neve, letargo, gemme che dormono, uccelli che migrano al contrario", "fine inverno: giorni che si allungano, primi fiori, tane che si svegliano", "primavera che arriva: gemme, api, uova, rondini che tornano", "primavera: fiori e impollinatori, nidi, pioggia e arcobaleni", "maggio: foglie nuove, lucciole in arrivo, frutti piccoli, ombra degli alberi", "inizio estate: giorno più lungo, grilli, cicale, stelle d'estate", "estate: caldo, acqua, temporali, insetti, frutti maturi", "piena estate: stelle cadenti di agosto, cicale, ombra, acqua da bere", "fine estate: vendemmia, uva, rientro, rondini che si radunano", "autunno: foglie che cambiano colore, castagne, funghi, migrazioni, nebbia", "tardo autunno: alberi spogli, semi che viaggiano, animali che fanno scorta", "inverno che arriva: gelo, stelle, luna, alberi che riposano"];
const WEEK_THEME = ["animali del bosco", "il corpo umano", "lo spazio e i pianeti", "alberi e piante", "acqua, nuvole e meteo", "uccelli e insetti", "invenzioni e scienziati", "il mare e i suoi abitanti", "colori e luce", "suoni e musica", "dinosauri e fossili", "le montagne e le rocce"];
const weekOf = (d: Date) => Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / (7 * 864e5));

type Line = { greet: string; line: string };
type Day = { day: string; tree: Line[]; bench: Line[] };
let inflight: Promise<void> | null = null;

const romeDay = (d = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(d);

async function generate(key: string, day: string, avoid: string[]): Promise<Day | null> {
  const now = new Date(`${day}T12:00:00Z`);
  const wd = new Intl.DateTimeFormat("it-IT", { weekday: "long", timeZone: "Europe/Rome" }).format(now);
  const month = new Intl.DateTimeFormat("it-IT", { month: "long", timeZone: "Europe/Rome" }).format(now);
  const theme = WEEK_THEME[weekOf(now) % WEEK_THEME.length];
  const prompt = `Oggi è ${wd} ${day} (${month}). In natura e nel cielo in questo periodo: ${SEASON[now.getUTCMonth()]}. Tema della settimana: ${theme} (almeno DUE TERZI dei testi parlano di questo tema o della stagione, con un fatto concreto e sorprendente; gli altri sono liberi ma di stagione). Scrivi i testi del giorno per gli alberi e le panchine parlanti di un'app per bambini (6-11 anni) a Bra, in Piemonte. Parlano in prima persona con voce da bambino curioso, allegro e un po' orgoglioso.
Servono ${PER_KIND} testi per gli ALBERI e ${PER_KIND} per le PANCHINE. Ognuno ha: "greet" (un saluto nuovo e diverso, 1 frase breve, che non dice il nome e non dice "buongiorno" o "buonasera") e "line" (2-3 frasi, massimo 300 caratteri, da leggere ad alta voce: una proposta divertente).
Tipi di proposta da alternare: ${TYPES.join("; ")}.
Regole: SOLO fatti certi e veri, da libro di scienze (niente battute senza senso: al massimo 3 barzellette per gruppo, chiare e che fanno davvero ridere); niente informazioni su luoghi reali di Bra; niente cose pericolose (mai correre vicino alla strada, mai arrampicarsi, mai accettare cose da sconosciuti); tono caldo e giocoso; niente emoji; tutti i testi diversi tra loro.${avoid.length ? `\nNON ripetere né riformulare né dire cose simili a questi testi dei giorni scorsi:\n- ${avoid.slice(0, 140).join("\n- ")}` : ""}`;
  const item = { type: "OBJECT", properties: { greet: { type: "STRING" }, line: { type: "STRING" } }, required: ["greet", "line"] };
  for (const model of MODELS) {
    for (let t = 0; t < 2; t++) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": key, "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { tree: { type: "ARRAY", items: item }, bench: { type: "ARRAY", items: item } }, required: ["tree", "bench"] } },
          }),
          signal: AbortSignal.timeout(90_000),
        });
        const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const txt = j.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!r.ok || !txt) continue;
        const o = JSON.parse(txt) as { tree?: Line[]; bench?: Line[] };
        const ok = (l?: Line[]) => (l ?? []).filter((x) => x.greet?.trim() && x.line?.trim() && cleanCheck(`${x.greet} ${x.line}`).ok).map((x) => ({ greet: x.greet.trim().slice(0, 120), line: x.line.trim().slice(0, 400) }));
        const tree = ok(o.tree);
        const bench = ok(o.bench);
        if (tree.length >= 12 && bench.length >= 12) return { day, tree, bench };
      } catch { /* try again */ }
    }
  }
  return null;
}

/** Prepares the young voice of the first lines in the background (asks our own voice service one piece at a time, stops when the free quota is over). */
async function prewarm(origin: string, d: Day) {
  let fails = 0;
  for (const l of [...d.tree.slice(0, PREWARM), ...d.bench.slice(0, PREWARM)]) {
    for (const text of partsForSpeech(`${l.greet} ${l.line}`, "it")) {
      try {
        const r = await fetch(`${origin}/api/tts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, voice: "young", lang: "it" }) });
        if (!r.ok && ++fails >= 3) return;
        if (r.ok) fails = 0;
      } catch { if (++fails >= 3) return; }
    }
  }
}

export const Route = createFileRoute("/api/daily-chatter")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const os = await import("node:os");
        const day = romeDay();
        const dir = path.join(process.env["DATA_DIR"] ?? process.cwd(), ".daily-cache");
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `chatter-${day}.json`);
        if (fs.existsSync(file)) return new Response(fs.readFileSync(file), { headers: { "content-type": "application/json", "cache-control": "no-cache" } });
        let key = process.env["GEMINI_API_KEY"] ?? "";
        if (!key) {
          try { key = fs.readFileSync(path.join(os.homedir(), ".auracity-gemini-key"), "utf8").replace(/\s/g, ""); } catch { /* none */ }
        }
        if (!key) return Response.json({ error: "no key" }, { status: 503 });
        if (!inflight) {
          const origin = new URL(request.url).origin;
          inflight = (async () => {
            let avoid: string[] = [];
            for (let back = 1; back <= 7; back++) {
              try {
                const prev = JSON.parse(fs.readFileSync(path.join(dir, `chatter-${romeDay(new Date(Date.now() - back * 864e5))}.json`), "utf8")) as Day;
                avoid.push(...[...prev.tree, ...prev.bench].filter((_, i) => i % 2 === 0).map((x) => x.line.slice(0, 80)));
              } catch { /* that day has no file */ }
            }
            try {
              for (const f of fs.readdirSync(dir)) if (/^chatter-\d{4}-\d{2}-\d{2}\.json$/.test(f) && Date.now() - fs.statSync(path.join(dir, f)).mtimeMs > 30 * 864e5) fs.unlinkSync(path.join(dir, f));
            } catch { /* nothing to tidy */ }
            const d = await generate(key, day, avoid);
            if (d) {
              fs.writeFileSync(file, JSON.stringify(d));
              void prewarm(origin, d);
            }
          })().finally(() => { setTimeout(() => { inflight = null; }, 120_000); });
        }
        return Response.json({ status: "writing" }, { status: 202 });
      },
    },
  },
});
