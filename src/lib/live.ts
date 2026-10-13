// "Today in Bra": real data fetched when the app opens (weather, sun, moon, what happened on this day).
// Nothing here is stored or invented: it changes every day, and questions are built from it.
import { useEffect, useState } from "react";
import { getMoonIllumination } from "suncalc";
import type { Lang } from "./i18n";
import { romeDate } from "@/utils/geo";

export type Today = {
  tempNow: number;
  code: number;
  isDay: boolean;
  tempMax: number;
  tempMin: number;
  rainPct: number;
  sunrise: string; // HH:MM
  sunset: string; // HH:MM
  moon: number; // 0..1
  event: { year: number; text: string } | null;
  aqi: number | null;
  quake: { mag: number; place: string } | null;
  birth: { year: number; name: string; others: string[] } | null;
  /** Saints of the day, e.g. { title: "San Serafino da Montegranaro", name: "Serafino" }. */
  saints: { title: string; name: string; target: string }[];
  saintInfo: string | null;
  /** More events of today, and events of another day to use as wrong answers. */
  events: { year: number; text: string }[];
  otherEvents: { year: number; text: string }[];
};

const WEATHER_IT: [number[], string, string][] = [
  [[0], "sereno", "clear"],
  [[1, 2], "poco nuvoloso", "partly cloudy"],
  [[3], "coperto", "overcast"],
  [[45, 48], "nebbia", "fog"],
  [[51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82], "pioggia", "rain"],
  [[71, 73, 75, 77, 85, 86], "neve", "snow"],
  [[95, 96, 99], "temporale", "thunderstorm"],
];
export const weatherWord = (code: number, lang: Lang) => {
  const w = WEATHER_IT.find(([codes]) => codes.includes(code));
  return w ? (lang === "it" ? w[1] : w[2]) : lang === "it" ? "variabile" : "variable";
};

const MOON_IT = ["Luna nuova", "Luna crescente", "Primo quarto", "Gibbosa crescente", "Luna piena", "Gibbosa calante", "Ultimo quarto", "Luna calante"];
const MOON_EN = ["New moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"];
export const moonIndex = (phase: number) => Math.round(phase * 8) % 8;
export const moonName = (phase: number, lang: Lang) => (lang === "it" ? MOON_IT : MOON_EN)[moonIndex(phase)]!;

export async function load(): Promise<Today> {
  const day = romeDate(new Date());
  const [mm, dd] = [day.slice(5, 7), day.slice(8, 10)];
  const weather = fetch(
    "https://api.open-meteo.com/v1/forecast?latitude=44.6985&longitude=7.8538&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=Europe%2FRome&forecast_days=1",
  ).then((r) => r.json());
  const history = fetch(`https://it.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`)
    .then((r) => r.json())
    .catch(() => null);
  const air = fetch("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=44.6985&longitude=7.8538&current=european_aqi&timezone=Europe%2FRome")
    .then((r) => r.json())
    .catch(() => null);
  const quake = fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson")
    .then((r) => r.json())
    .catch(() => null);
  // Italian Wikipedia has no "births" feed: use the English one (names are the same).
  const births = fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/births/${mm}/${dd}`)
    .then((r) => r.json())
    .catch(() => null);
  const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  const wikiDay = `${Number(dd)}_${MONTHS[Number(mm) - 1]}`;
  const saintsP = fetch(`https://it.wikipedia.org/w/api.php?action=parse&page=${wikiDay}&prop=tocdata&format=json&origin=*&formatversion=2`)
    .then((r) => r.json())
    .then(async (j: { parse?: { tocdata?: { sections?: { line: string; index: string }[] } } }) => {
      const sec = j.parse?.tocdata?.sections?.find((x) => x.line === "Religiose");
      if (!sec) return [] as string[];
      const t = await fetch(`https://it.wikipedia.org/w/api.php?action=parse&page=${wikiDay}&section=${sec.index}&prop=wikitext&format=json&origin=*&formatversion=2`).then((r) => r.json());
      return String(t.parse?.wikitext ?? "").split("\n");
    })
    .catch(() => [] as string[]);
  // events of a different day (about a month later) give believable wrong answers
  const other = new Date(Date.now() + 37 * 86400_000);
  const om = String(other.getMonth() + 1).padStart(2, "0");
  const od = String(other.getDate()).padStart(2, "0");
  const otherP = fetch(`https://it.wikipedia.org/api/rest_v1/feed/onthisday/events/${om}/${od}`)
    .then((r) => r.json())
    .catch(() => null);
  const [w, h, a, q, b, saintLines, oth] = await Promise.all([weather, history, air, quake, births, saintsP, otherP]);
  const clean = (s: string) =>
    s
      .replace(/<ref[^>]*>.*?<\/ref>/g, "")
      .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
      .replace(/'{2,}/g, "");
  const saints = saintLines
    .filter((l) => /^\*\s*(San|Sant'|Santa|Santi|Santo|Beato)\b/.test(l))
    .map((l) => clean(l.replace(/^\*\s*/, "")).split(",")[0]!.trim())
    .filter((t) => t.length > 3 && t.length < 48)
    .map((title) => ({ title, line: saintLines.find((l) => clean(l.replace(/^\*\s*/, "")).startsWith(title)) ?? "" }))
    .map(({ title, line }) => {
      const target = (line.match(/\[\[([^\]|#]+)/)?.[1] ?? "").trim();
      const rest = title.replace(/^(San|Sant'|Santa|Santi|Santo|Beato)\s*/i, "");
      return { title, name: rest.split(/\s+/)[0]!.replace(/[^\p{L}']/gu, ""), target };
    })
    .filter((s) => s.name.length > 2 && !/^(Santi|Beati)/.test(s.title))
    .slice(0, 5);
  let saintInfo: string | null = null;
  const lead = saints[0];
  if (lead?.target) {
    try {
      const sum = await fetch(`https://it.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(lead.target.replace(/ /g, "_"))}`).then((r) => r.json());
      const text = String(sum.extract ?? "");
      const parts = text.match(/[^.!?]+[.!?]+/g) ?? [text];
      saintInfo = (parts.slice(0, 2).join(" ").trim() || null)?.slice(0, 320) ?? null;
    } catch {
      /* the greeting is shown without the short biography */
    }
  }
  const evList = (x: { events?: { text: string; year: number }[] } | null) => (x?.events ?? []).filter((e) => e.text && e.text.length > 25 && e.text.length < 150 && e.year >= 1500);
  const feats = ((q?.features ?? []) as { properties: { mag: number; place: string } }[]).filter((f) => typeof f.properties.mag === "number");
  const top = feats.sort((x, y) => y.properties.mag - x.properties.mag)[0];
  const person = (t: string) => t.split(/[,(]/)[0]!.trim();
  const born = ((b?.births ?? []) as { text: string; year: number }[]).filter((e) => e.text && e.year >= 1700 && person(e.text).length > 3 && person(e.text).length < 32);
  const bp = born.length ? born[Number(day.replace(/-/g, "")) % born.length]! : null;
  const events = ((h?.events ?? []) as { text: string; year: number }[]).filter((e) => e.text && e.text.length < 190 && e.year >= 1500);
  const pick = events.length ? events[Number(day.replace(/-/g, "")) % events.length]! : null;
  return {
    tempNow: Math.round(w.current.temperature_2m),
    code: w.current.weather_code,
    isDay: w.current.is_day === 1,
    tempMax: Math.round(w.daily.temperature_2m_max[0]),
    tempMin: Math.round(w.daily.temperature_2m_min[0]),
    rainPct: w.daily.precipitation_probability_max[0] ?? 0,
    sunrise: String(w.daily.sunrise[0]).slice(11, 16),
    sunset: String(w.daily.sunset[0]).slice(11, 16),
    moon: getMoonIllumination(new Date()).phase,
    event: pick ? { year: pick.year, text: pick.text } : null,
    aqi: typeof a?.current?.european_aqi === "number" ? Math.round(a.current.european_aqi) : null,
    quake: top ? { mag: Math.round(top.properties.mag * 10) / 10, place: top.properties.place } : null,
    birth: bp ? { year: bp.year, name: person(bp.text), others: born.filter((e) => e !== bp).slice(0, 8).map((e) => person(e.text)) } : null,
    saints,
    saintInfo,
    events: evList(h).slice(0, 12),
    otherEvents: evList(oth).slice(0, 12),
  };
}

/** Today's live data, cached for 20 minutes on the phone. */
export function useToday() {
  const [data, setData] = useState<Today | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let off = false;
    try {
      const c = JSON.parse(sessionStorage.getItem("aura_today") ?? "null") as { at: number; day: string; d: Today } | null;
      if (c && c.day === romeDate(new Date()) && Date.now() - c.at < 20 * 60_000 && "aqi" in c.d && "saintInfo" in c.d) {
        setData(c.d);
        return;
      }
    } catch {
      /* ignore */
    }
    load()
      .then((d) => {
        if (off) return;
        setData(d);
        try {
          sessionStorage.setItem("aura_today", JSON.stringify({ at: Date.now(), day: romeDate(new Date()), d }));
        } catch {
          /* ignore */
        }
      })
      .catch(() => !off && setFailed(true));
    return () => {
      off = true;
    };
  }, []);
  return { data, failed };
}

export type LiveQuestion = { id: string; kids: boolean; q: string; options: string[]; ok: number };

const hhmm = (s: string, add: number) => {
  const [h, m] = s.split(":").map(Number) as [number, number];
  const t = (h * 60 + m + add + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
const seeded = (seed: number) => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
function shuffle<T>(arr: T[], rnd: () => number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const NAMES = ["Marco", "Luca", "Giulia", "Anna", "Paolo", "Lucia", "Giovanni", "Francesco", "Maria", "Andrea", "Chiara", "Matteo", "Sara", "Elena", "Davide", "Marta", "Alberto", "Teresa"];

/** Questions for grown-ups, built from today's real data and from verified facts about Bra and Piedmont. */
export function buildLiveQuestions(d: Today, lang: Lang): LiveQuestion[] {
  const it = lang === "it";
  const day = Number(romeDate(new Date()).replace(/-/g, ""));
  const rnd = seeded(day);
  const make = (id: string, q: string, right: string, wrong: string[]): LiveQuestion => {
    const options = shuffle([right, ...wrong], rnd);
    return { id: `live-${day}-${id}`, kids: false, q, options, ok: options.indexOf(right) };
  };
  const out: LiveQuestion[] = [];
  const dateWords = new Intl.DateTimeFormat(it ? "it-IT" : "en-GB", { timeZone: "Europe/Rome", day: "numeric", month: "long" }).format(new Date());

  // Which of these really happened today?
  if (d.events.length > 0 && d.otherEvents.length >= 2) {
    const e = d.events[day % d.events.length]!;
    const wrong = shuffle(d.otherEvents, rnd).slice(0, 2);
    out.push(make("e", it ? `Quale di questi fatti è accaduto proprio oggi, ${dateWords}?` : `Which of these happened on this very day, ${dateWords}?`, e.text, wrong.map((x) => x.text)));
  }
  if (d.event) {
    const y = d.event.year;
    out.push(make("h", `${it ? "In che anno?" : "In which year?"} ${d.event.text}`, String(y), [String(y - 7), String(y + 11)]));
  }
  if (d.birth && d.birth.others.length >= 2) out.push(make("b", it ? `Chi è nato proprio oggi, nel ${d.birth.year}?` : `Who was born on this very day in ${d.birth.year}?`, d.birth.name, shuffle(d.birth.others, rnd).slice(0, 2)));
  // Culture: two verified questions a day
  const pool = CULTURE.filter((_, i) => (i + day) % 3 === 0 || (i * 7 + day) % 5 === 0).slice(0, 2);
  (pool.length ? pool : CULTURE.slice(day % CULTURE.length, (day % CULTURE.length) + 2)).forEach((c, i) => {
    out.push(make(`c${i}`, it ? c.q.it : c.q.en, it ? c.a.it : c.a.en, (it ? c.w.it : c.w.en)));
  });
  return out;
}

type Culture = { q: { it: string; en: string }; a: { it: string; en: string }; w: { it: string[]; en: string[] } };
// Facts taken from the app's own sourced texts or well-known public facts.
const CULTURE: Culture[] = [
  { q: { it: "Chi progettò la chiesa di Santa Chiara a Bra, con la sua «cupola diafana»?", en: "Who designed the church of Santa Chiara in Bra, with its “diaphanous dome”?" }, a: { it: "Bernardo Antonio Vittone", en: "Bernardo Antonio Vittone" }, w: { it: ["Filippo Juvarra", "Guarino Guarini"], en: ["Filippo Juvarra", "Guarino Guarini"] } },
  { q: { it: "In che anno la Residenza Sabauda di Pollenzo è stata riconosciuta dall'UNESCO?", en: "In which year was the Savoy Residence of Pollenzo recognised by UNESCO?" }, a: { it: "1997", en: "1997" }, w: { it: ["1962", "2008"], en: ["1962", "2008"] } },
  { q: { it: "Quale movimento nato a Bra nel 1986 difende il cibo buono, pulito e giusto?", en: "Which movement born in Bra in 1986 defends good, clean and fair food?" }, a: { it: "Slow Food", en: "Slow Food" }, w: { it: ["Km Zero", "Fast Good"], en: ["Zero Km", "Fast Good"] } },
  { q: { it: "Quale formaggio DOP prende il nome dalla città di Bra?", en: "Which PDO cheese takes its name from the city of Bra?" }, a: { it: "Bra", en: "Bra" }, w: { it: ["Castelmagno", "Raschera"], en: ["Castelmagno", "Raschera"] } },
  { q: { it: "Quale re di casa Savoia trasformò il borgo di Pollenzo in un modello di tenuta agricola tra il 1832 e il 1848?", en: "Which Savoy king turned the village of Pollenzo into a model farm between 1832 and 1848?" }, a: { it: "Carlo Alberto", en: "Charles Albert" }, w: { it: ["Vittorio Emanuele II", "Umberto I"], en: ["Victor Emmanuel II", "Umberto I"] } },
  { q: { it: "Quale fiume attraversa Torino?", en: "Which river runs through Turin?" }, a: { it: "Il Po", en: "The Po" }, w: { it: ["Il Tanaro", "La Dora Baltea"], en: ["The Tanaro", "The Dora Baltea"] } },
  { q: { it: "Quale fiume scorre vicino a Bra e Pollenzo, affluente del Po?", en: "Which tributary of the Po flows near Bra and Pollenzo?" }, a: { it: "Il Tanaro", en: "The Tanaro" }, w: { it: ["Il Ticino", "L'Adige"], en: ["The Ticino", "The Adige"] } },
  { q: { it: "Per quale prodotto è famosa nel mondo la città di Alba, vicina a Bra?", en: "What is the city of Alba, near Bra, famous for worldwide?" }, a: { it: "Il tartufo bianco", en: "The white truffle" }, w: { it: ["Il pesce azzurro", "Il caffè"], en: ["Blue fish", "Coffee"] } },
  { q: { it: "Quale vino rosso, chiamato «re dei vini», nasce nelle vicine Langhe?", en: "Which red wine, called the “king of wines”, comes from the nearby Langhe?" }, a: { it: "Il Barolo", en: "Barolo" }, w: { it: ["Il Chianti", "L'Amarone"], en: ["Chianti", "Amarone"] } },
  { q: { it: "Quale università fondata nel 2004, legata a Slow Food, ha sede a Pollenzo?", en: "Which university founded in 2004, linked to Slow Food, is based in Pollenzo?" }, a: { it: "L'Università di Scienze Gastronomiche", en: "The University of Gastronomic Sciences" }, w: { it: ["Il Politecnico di Torino", "L'Università Bocconi"], en: ["The Polytechnic of Turin", "Bocconi University"] } },
  { q: { it: "Come si chiama la salsa piemontese a base di acciughe, aglio e olio, in cui si intingono le verdure?", en: "What is the Piedmontese dip of anchovies, garlic and oil, used for vegetables, called?" }, a: { it: "Bagna càuda", en: "Bagna càuda" }, w: { it: ["Salsa verde", "Pesto"], en: ["Salsa verde", "Pesto"] } },
  { q: { it: "Quale manifestazione biennale dedicata ai formaggi di qualità si tiene a Bra?", en: "Which biennial event for quality cheeses takes place in Bra?" }, a: { it: "Cheese", en: "Cheese" }, w: { it: ["Vinitaly", "Salone del Gusto"], en: ["Vinitaly", "Salone del Gusto"] } },
];
