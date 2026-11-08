// News and notices of the Comune di Bra (road works, closures, services, announcements), read from its official news page every hour.
import { createFileRoute } from "@tanstack/react-router";

const SOURCE = "https://www.comune.bra.cn.it/it/news";
const UA = "AURACITY-pilot/1.0 (+https://github.com/Moroccocasablanca/auracity-ar-explorer)";
const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
// things a citizen needs to know today: works, closures, suspended services, warnings
const URGENT = /viabilit|chius|lavori|divieto|sospes|sospension|interrott|allerta|emergenza|senso unico|deviazion|ordinanza/i;

type Item = { title: string; type: string; date: string; summary: string; url: string; urgent: boolean };

const text = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#039;|&#39;|&rsquo;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

async function load(): Promise<Item[] | null> {
  try {
    const html = await (await fetch(SOURCE, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20_000) })).text();
    const out: Item[] = [];
    for (const c of html.match(/<article class="card-wrapper[\s\S]*?<\/article>/g) ?? []) {
      const d = /(\d{1,2})\s+([a-zà-ú]+)\s+(\d{4})/i.exec(text(/<span class="h5 card-pretitle">([\s\S]*?)<\/span>/.exec(c)?.[1] ?? ""));
      const mo = d ? MONTHS.indexOf(d[2]!.toLowerCase()) : -1;
      const title = text(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(c)?.[1] ?? "");
      const url = /href="([^"]+)"\s+class="link-detail"|class="link-detail"[^>]*href="([^"]+)"/.exec(c);
      if (!d || mo < 0 || !title) continue;
      const type = text(/card-pretitle-link">[\s\S]*?<\/svg>([\s\S]*?)<\/a>/.exec(c)?.[1] ?? "");
      const summary = text(/<p class="card-text">([\s\S]*?)<\/p>/.exec(c)?.[1] ?? "").slice(0, 200);
      out.push({ title, type, date: `${d[3]}-${String(mo + 1).padStart(2, "0")}-${String(Number(d[1])).padStart(2, "0")}`, summary, url: url?.[1] ?? url?.[2] ?? SOURCE, urgent: URGENT.test(`${title} ${type}`) });
    }
    return out.length ? out.slice(0, 12) : null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/news-bra")({
  server: {
    handlers: {
      GET: async () => {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const dir = path.join(process.env["DATA_DIR"] ?? process.cwd(), ".daily-cache");
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, "news-bra.json");
        const headers = { "cache-control": "no-cache" };
        const read = () => JSON.parse(fs.readFileSync(file, "utf8")) as { at: number; items: Item[] };
        try {
          const c = read();
          if (Date.now() - c.at < 3600_000) return Response.json({ status: "ok", items: c.items, source: SOURCE }, { headers });
        } catch { /* not read yet */ }
        const items = await load();
        if (!items) {
          try { return Response.json({ status: "ok", items: read().items, source: SOURCE }, { headers }); } catch { return Response.json({ status: "unavailable", source: SOURCE }, { headers }); }
        }
        fs.writeFileSync(file, JSON.stringify({ at: Date.now(), items }));
        return Response.json({ status: "ok", items, source: SOURCE }, { headers });
      },
    },
  },
});
