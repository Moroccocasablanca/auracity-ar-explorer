// Pharmacy on duty (night, weekends, holidays) for Bra. It stays up to date by itself: the official calendar of the ASL CN2
// Alba-Bra is found on aslcn2.it, read by two AI models (a table in a PDF), and only the days on which BOTH models agree are used.
// The result is kept on disk, so every visit afterwards is instant. Needs GEMINI_API_KEY (locally ~/.auracity-gemini-key).
import { createFileRoute } from "@tanstack/react-router";

const MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
const ASL = "https://www.aslcn2.it";
const UA = "AURACITY-pilot/1.0 (+https://github.com/Moroccocasablanca/auracity-ar-explorer)";

type Row = { date: string; day: string | null; night: string | null; dayTown: string | null; nightTown: string | null };
type Cache = { months: Record<string, { rows: Row[]; pdf: string; at: number }>; failedAt?: number };

let running: Promise<void> | null = null;

const romeDate = (d = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(d); // YYYY-MM-DD
const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-zà-ú]/g, "");

async function discoverPdfs(): Promise<string[]> {
  const found: string[] = [];
  const search = await (await fetch(`${ASL}/?s=turni+guardia+farmaceutica`, { headers: { "user-agent": UA } })).text();
  const pages = [...new Set([...search.matchAll(/href="(https:\/\/www\.aslcn2\.it\/concorsi-avvisi\/[^"]*(?:turni|calendario)[^"]*guardia[^"]*)"/g)].map((m) => m[1]!))];
  const year = romeDate().slice(0, 4);
  for (const page of pages.filter((p) => p.includes(year)).slice(0, 4)) {
    const html = await (await fetch(page, { headers: { "user-agent": UA } })).text();
    for (const m of html.matchAll(/href="(https:\/\/www\.aslcn2\.it\/media\/[^"]+\.pdf)"/g)) found.push(m[1]!);
  }
  return [...new Set(found)].sort().reverse(); // newest upload folder first
}

async function askModel(key: string, model: string, pdf: string, month: string): Promise<Row[] | null> {
  const [y, mo] = month.split("-");
  const prompt = `Questo PDF è il calendario dei turni di guardia farmaceutica ASL CN2 Alba-Bra. Leggi SOLO il mese ${mo}/${y} e per OGNI giorno del mese riporta, per le farmacie di BRA:
- "day": la farmacia nella colonna "BRA - SERVIZIO FERIALE / FESTIVO DIURNO" (nome scritto nella cella, senza la parola "Farmacia"),
- "night": la farmacia nella colonna "ZONA BRA - TURNO NOTTURNO 19:30-08:30",
- "dayTown" e "nightTown": il comune se è scritto (es. Sommariva Bosco, Roreto di Cherasco); per Bra lascia "Bra".
Se una cella è vuota usa null. Non inventare: se non sei sicuro di una cella usa null. date nel formato YYYY-MM-DD.`;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: "application/pdf", data: pdf } }, { text: prompt }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: { date: { type: "STRING" }, day: { type: "STRING", nullable: true }, night: { type: "STRING", nullable: true }, dayTown: { type: "STRING", nullable: true }, nightTown: { type: "STRING", nullable: true } },
              required: ["date"],
            },
          },
        },
      }),
    });
    const j = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!res.ok || !text) return null;
    return (JSON.parse(text) as Row[]).filter((r) => r.date?.startsWith(month));
  } catch {
    return null;
  }
}

/** Only what both readings agree on is kept; a cell they disagree on stays empty (the app then points to the official calendar). */
function agree(a: Row[], b: Row[]): Row[] {
  const byDate = new Map(b.map((r) => [r.date, r]));
  const out: Row[] = [];
  for (const r of a) {
    const o = byDate.get(r.date);
    if (!o) continue;
    const same = (x: string | null, y: string | null) => (x && y && norm(x) === norm(y) ? x : null);
    out.push({ date: r.date, day: same(r.day, o.day), night: same(r.night, o.night), dayTown: r.dayTown, nightTown: r.nightTown });
  }
  return out;
}

async function refresh(key: string, fs: typeof import("node:fs"), file: string) {
  const cache: Cache = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Cache) : { months: {} };
  const month = romeDate().slice(0, 7);
  try {
    for (const url of await discoverPdfs()) {
      const buf = Buffer.from(await (await fetch(url, { headers: { "user-agent": UA } })).arrayBuffer());
      const pdf = buf.toString("base64");
      const [a, b] = await Promise.all(MODELS.map((m) => askModel(key, m, pdf, month)));
      if (!a || !b || a.length < 20 || b.length < 20) continue; // this PDF does not cover the month (or a model was busy)
      const rows = agree(a, b);
      if (rows.filter((r) => r.night || r.day).length < 15) continue;
      cache.months[month] = { rows, pdf: url, at: Date.now() };
      delete cache.failedAt;
      fs.writeFileSync(file, JSON.stringify(cache));
      return;
    }
    cache.failedAt = Date.now();
  } catch {
    cache.failedAt = Date.now();
  }
  fs.writeFileSync(file, JSON.stringify(cache));
}

export const Route = createFileRoute("/api/pharmacy-duty")({
  server: {
    handlers: {
      GET: async () => {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const os = await import("node:os");
        let key = process.env["GEMINI_API_KEY"] ?? "";
        if (!key) {
          try { key = fs.readFileSync(path.join(os.homedir(), ".auracity-gemini-key"), "utf8").replace(/\s/g, ""); } catch { /* no local key */ }
        }
        const dir = path.join(process.cwd(), ".daily-cache");
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, "pharmacy-duty.json");
        const today = romeDate();
        const yesterday = romeDate(new Date(Date.now() - 864e5));
        const cache: Cache = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Cache) : { months: {} };
        const rows = cache.months[today.slice(0, 7)]?.rows ?? [];
        const t = rows.find((r) => r.date === today);
        const y = rows.find((r) => r.date === yesterday) ?? (yesterday.slice(0, 7) !== today.slice(0, 7) ? cache.months[yesterday.slice(0, 7)]?.rows.find((r) => r.date === yesterday) : undefined);
        const headers = { "cache-control": "public, max-age=600" };
        if (t && (t.day || t.night)) {
          return Response.json({ status: "ok", today: t, yesterday: y ?? null, source: cache.months[today.slice(0, 7)]!.pdf, calendar: `${ASL}/?s=turni+guardia+farmaceutica` }, { headers });
        }
        const retryAfter = cache.failedAt ? cache.failedAt + 3600_000 : 0;
        if (key && !running && Date.now() > retryAfter) {
          running = refresh(key, fs, file).finally(() => { running = null; });
        }
        if (running) return Response.json({ status: "pending" }, { status: 202 });
        return Response.json({ status: "unavailable", calendar: `${ASL}/?s=turni+guardia+farmaceutica` });
      },
    },
  },
});
