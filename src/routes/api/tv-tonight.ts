// TV tonight (prime time) on all the main Italian channels, from the public guide of guidatv.sky.it (it lists the free channels too).
// If that guide is down, the official public Rai schedule is used for the Rai channels.
// It updates itself: one fetch per channel per Rome day, kept in memory and on disk, nothing to do by hand.
import { createFileRoute } from "@tanstack/react-router";

const SKY = "https://apid.sky.it/gtv/v1";
const SOURCE = "https://guidatv.sky.it";
const UA = "AURACITY-pilot/1.0 (+https://github.com/Moroccocasablanca/auracity-ar-explorer)";
// In the order shown in the app: the big generalist channels first, then the rest of the free ones.
const WANTED = ["Rai 1", "Rai 2", "Rai 3", "Rete 4", "Canale 5", "Italia 1", "La7", "TV8", "Nove", "20", "Rai 4", "Iris", "Rai Movie", "Cielo", "Real Time", "La7 Cinema"];
const RAI_FALLBACK = ["rai-1", "rai-2", "rai-3", "rai-4", "rai-movie"];

type Show = { hour: string; title: string; minutes: number };
type Tonight = { at?: number; fallback?: boolean; date: string; channels: { name: string; shows: Show[] }[]; source: string };

const romeDate = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date()); // YYYY-MM-DD
const romeHour = (iso: string) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
const toMinutes = (d: string) => {
  const [h = "0", m = "0"] = d.split(":");
  return Number(h) * 60 + Number(m);
};
const NEWS = /telegiornale|^tg\s?\d|^tg\d|tg\s?(la7|5|com)|studio aperto|sky tg24|meteo|previsioni|pubblicit|televendita|shopping/i;
const cleanTitle = (s: string) => s.replace(/\s*-?\s*(Puntata del\s*)?\d{1,2}\/\d{1,2}\/\d{4}/i, "").replace(/\s*-\s*Stag\..*$/i, "").trim();
const niceName = (n: string) => {
  const x = n.replace(/\s*HD$/i, "").trim();
  if (/^20\s?mediaset$/i.test(x)) return "20";
  if (/^la7cinema$/i.test(x)) return "La7 Cinema";
  if (/^nove$/i.test(x)) return "Nove";
  if (/^la7$/i.test(x)) return "La7";
  return x;
};

function pick(shows: Show[]): Show[] {
  // what you would sit down to watch: no news, no short fillers; at most 3 per channel
  return shows.filter((s) => s.minutes >= 35 && !NEWS.test(s.title)).slice(0, 3);
}

async function loadSky(date: string): Promise<Tonight["channels"]> {
  const list = ((await (await fetch(`${SKY}/channels?env=DTH`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(15_000) })).json()) as { channels?: { id: string | number; name: string }[] }).channels ?? [];
  const byName = new Map<string, string | number>();
  for (const c of list) if (!byName.has(niceName(c.name).toLowerCase())) byName.set(niceName(c.name).toLowerCase(), c.id);
  // 20:00-24:00 in Rome is 18:00-23:00 UTC at the widest (summer/winter time); the exact hours are filtered below
  const fromIso = `${date}T18:00:00Z`;
  const toIso = `${date}T23:00:00Z`;
  const out = await Promise.all(
    WANTED.map(async (name) => {
      const id = byName.get(name.toLowerCase());
      if (!id) return null;
      try {
        const r = await fetch(`${SKY}/events?from=${fromIso}&to=${toIso}&pageSize=60&pageNum=0&env=DTH&channels=${id}`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20_000) });
        if (!r.ok) return null;
        const j = (await r.json()) as { events?: { starttime: string; endtime: string; eventTitle?: string; epgEventTitle?: string }[] };
        const shows = (j.events ?? [])
          .map((e) => {
            const epg = (e.epgEventTitle ?? "").replace(/^S\d+\s*Ep\d+\s*-\s*/i, "").trim();
            const ev = (e.eventTitle ?? "").trim();
            // for series the "event title" is often only the episode name: the programme name is the better label
            const title = cleanTitle(epg && (/^ep\.?\s*\d+/i.test(ev) || ev.length < 4 || (e.epgEventTitle ?? "") !== epg) ? epg : ev || epg);
            return { hour: romeHour(e.starttime), title, minutes: Math.round((Date.parse(e.endtime) - Date.parse(e.starttime)) / 60_000) };
          })
          .filter((s) => s.title && s.hour >= "20:00" && s.hour <= "23:59")
          .sort((a, b) => a.hour.localeCompare(b.hour));
        const shown = pick(shows);
        return shown.length ? { name, shows: shown } : null;
      } catch {
        return null;
      }
    }),
  );
  return out.filter((x): x is NonNullable<typeof x> => !!x);
}

async function loadRai(date: string): Promise<Tonight["channels"]> {
  const [y, m, d] = date.split("-");
  const out: Tonight["channels"] = [];
  for (const slug of RAI_FALLBACK) {
    try {
      const r = await fetch(`https://www.raiplay.it/palinsesto/app/${slug}/${d}-${m}-${y}.json`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(15_000) });
      if (!r.ok) continue;
      const j = (await r.json()) as { channel?: string; events?: { name?: string; hour?: string; duration?: string }[] };
      const shows = (j.events ?? [])
        .filter((e) => e.name && e.hour && e.hour >= "20:00" && e.hour <= "23:59")
        .map((e) => ({ hour: e.hour!, title: cleanTitle(e.name!), minutes: toMinutes(e.duration ?? "0:0") }));
      const shown = pick(shows);
      if (shown.length) out.push({ name: j.channel ?? slug, shows: shown });
    } catch {
      /* this channel is skipped */
    }
  }
  return out;
}

async function load(date: string): Promise<Tonight | null> {
  let channels: Tonight["channels"] = [];
  for (let attempt = 0; attempt < 2 && channels.length < 6; attempt++) {
    try {
      channels = await loadSky(date);
    } catch {
      /* try again, then fall back to Rai */
    }
  }
  if (channels.length >= 6) return { at: Date.now(), date, channels, source: SOURCE };
  const rai = await loadRai(date);
  return rai.length ? { at: Date.now(), fallback: true, date, channels: rai, source: "https://www.raiplay.it/guidatv" } : null;
}

let running: Promise<Tonight | null> | null = null;

export const Route = createFileRoute("/api/tv-tonight")({
  server: {
    handlers: {
      GET: async () => {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const dir = path.join(process.env["DATA_DIR"] ?? process.cwd(), ".daily-cache");
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, "tv-tonight.json");
        const today = romeDate();
        const headers = { "cache-control": "public, max-age=900" };
        try {
          const cached = JSON.parse(fs.readFileSync(file, "utf8")) as Tonight;
          if (cached.date === today && (!cached.fallback || Date.now() - (cached.at ?? 0) < 15 * 60_000)) return Response.json({ status: "ok", ...cached }, { headers });
        } catch {
          /* no cache yet for today */
        }
        running ??= load(today).finally(() => { running = null; });
        const fresh = await running;
        if (!fresh) return Response.json({ status: "unavailable", source: SOURCE }, { headers: { "cache-control": "no-store" } });
        fs.writeFileSync(file, JSON.stringify(fresh));
        return Response.json({ status: "ok", ...fresh }, { headers });
      },
    },
  },
});
