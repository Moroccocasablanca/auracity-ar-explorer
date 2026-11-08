// Events in Bra (shows, fairs, exhibitions, concerts...) from the official list of the Comune di Bra, read again every few hours:
// nothing to type by hand. Only what the Comune publishes is shown, with a link to the official page.
import { createFileRoute } from "@tanstack/react-router";

const SOURCE = "https://www.comune.bra.cn.it/it/eventi";
const UA = "AURACITY-pilot/1.0 (+https://github.com/Moroccocasablanca/auracity-ar-explorer)";
const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
// the big ones: fairs, festivals, exhibitions, food events... (not the weekly routine)
const BIG = /cheese|slow food|fiera|festival|sagra|mostra|rassegna|mercatino|palio|maratona|notte|salone|degustazion|vino|formagg|tartuf|concerto/i;

type Ev = { title: string; category: string; dates: string[]; ongoing: boolean; summary: string; url: string; image: string | null; big: boolean };

const text = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#039;|&#39;|&rsquo;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

function parseDate(s: string): { iso: string; ongoing: boolean } | null {
  const m = /(Da\s+)?(\d{1,2})\s+([a-zà-ú]+)\s+(\d{4})/i.exec(s);
  if (!m) return null;
  const mo = MONTHS.indexOf(m[3]!.toLowerCase());
  if (mo < 0) return null;
  return { iso: `${m[4]}-${String(mo + 1).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`, ongoing: Boolean(m[1]) };
}

async function load(): Promise<Ev[] | null> {
  try {
    const html = await (await fetch(SOURCE, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20_000) })).text();
    const cards = html.match(/<article class="card-wrapper[\s\S]*?<\/article>/g) ?? [];
    const byTitle = new Map<string, Ev>();
    for (const c of cards) {
      const when = parseDate(text(/card-pretitle">([\s\S]*?)<\/span>/.exec(c)?.[1] ?? ""));
      const title = text(/<h3 class="card-title[^>]*>([\s\S]*?)<\/h3>/.exec(c)?.[1] ?? "");
      const url = /class="link-detail"[^>]*href="([^"]+)"/.exec(c)?.[1] ?? SOURCE;
      if (!when || !title) continue;
      const category = text(/class="category text-decoration-none">([\s\S]*?)<\/div>/.exec(c)?.[1] ?? "");
      const img = /<img src="([^"]+)"/.exec(c)?.[1];
      const prev = byTitle.get(title);
      if (prev) { prev.dates.push(when.iso); continue; } // the same event on several days
      byTitle.set(title, {
        title,
        category,
        dates: [when.iso],
        ongoing: when.ongoing,
        summary: text(/<p class="card-text">([\s\S]*?)<\/p>/.exec(c)?.[1] ?? "").slice(0, 220),
        url,
        image: img ? (img.startsWith("//") ? `https:${img}` : img) : null,
        big: BIG.test(`${title} ${category}`),
      });
    }
    const list = [...byTitle.values()];
    for (const e of list) e.dates.sort();
    return list.length ? list : null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/events-bra")({
  server: {
    handlers: {
      GET: async () => {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const dir = path.join(process.env["DATA_DIR"] ?? process.cwd(), ".daily-cache");
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, "events-bra.json");
        const headers = { "cache-control": "no-cache" };
        try {
          const c = JSON.parse(fs.readFileSync(file, "utf8")) as { at: number; events: Ev[] };
          if (Date.now() - c.at < 3 * 3600_000) return Response.json({ status: "ok", events: c.events, source: SOURCE }, { headers });
        } catch { /* not read yet */ }
        const events = await load();
        if (!events) {
          try { // the page is down: the last good list is better than nothing
            const c = JSON.parse(fs.readFileSync(file, "utf8")) as { events: Ev[] };
            return Response.json({ status: "ok", events: c.events, source: SOURCE }, { headers });
          } catch { return Response.json({ status: "unavailable", source: SOURCE }, { headers }); }
        }
        fs.writeFileSync(file, JSON.stringify({ at: Date.now(), events }));
        return Response.json({ status: "ok", events, source: SOURCE }, { headers });
      },
    },
  },
});
