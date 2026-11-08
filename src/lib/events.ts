import { useEffect, useState } from "react";

export type BraEvent = { title: string; category: string; dates: string[]; ongoing: boolean; summary: string; url: string; image: string | null; big: boolean };
export type EventsData = { status: "ok"; events: BraEvent[]; source: string } | { status: "unavailable"; source: string };

export function useEvents(): EventsData | null {
  const [data, setData] = useState<EventsData | null>(null);
  useEffect(() => {
    let stop = false;
    fetch("/api/events-bra", { cache: "no-cache" })
      .then((r) => r.json() as Promise<EventsData>)
      .then((j) => { if (!stop) setData(j); })
      .catch(() => { if (!stop) setData({ status: "unavailable", source: "https://www.comune.bra.cn.it/it/eventi" }); });
    return () => { stop = true; };
  }, []);
  return data;
}

const rome = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(d);
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export type Group = "weekend" | "week" | "month" | "later" | "ongoing";
export const GROUP_ORDER: Group[] = ["weekend", "week", "month", "later", "ongoing"];

/** Where an event falls from today: this weekend, the rest of this week, this month, later, or already running (exhibitions...). */
export function groupEvents(events: BraEvent[], now = new Date()): { group: Group; event: BraEvent; next: string }[] {
  const today = rome(now);
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  const sat = addDays(today, dow === 0 ? -1 : 6 - dow);
  const sun = addDays(sat, 1);
  const endWeek = addDays(today, dow === 0 ? 0 : 7 - dow);
  const month = today.slice(0, 7);
  const out: { group: Group; event: BraEvent; next: string }[] = [];
  for (const e of events) {
    const upcoming = e.dates.filter((d) => d >= today);
    if (e.ongoing && e.dates[0]! <= today) { out.push({ group: "ongoing", event: e, next: e.dates[0]! }); continue; }
    const next = upcoming[0];
    if (!next) continue;
    const group: Group = next === sat || next === sun ? "weekend" : next <= endWeek ? "week" : next.startsWith(month) ? "month" : "later";
    out.push({ group, event: e, next });
  }
  return out.sort((a, b) => a.next.localeCompare(b.next) || Number(b.event.big) - Number(a.event.big));
}

export const prettyDate = (iso: string, lang = "it-IT") => new Intl.DateTimeFormat(lang, { timeZone: "Europe/Rome", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${iso}T12:00:00Z`));

export type NewsItem = { title: string; type: string; date: string; summary: string; url: string; urgent: boolean };
export type NewsData = { status: "ok"; items: NewsItem[]; source: string } | { status: "unavailable"; source: string };

/** Latest news and notices of the Comune di Bra. */
export function useNews(): NewsData | null {
  const [data, setData] = useState<NewsData | null>(null);
  useEffect(() => {
    let stop = false;
    fetch("/api/news-bra", { cache: "no-cache" })
      .then((r) => r.json() as Promise<NewsData>)
      .then((j) => { if (!stop) setData(j); })
      .catch(() => { if (!stop) setData({ status: "unavailable", source: "https://www.comune.bra.cn.it/it/news" }); });
    return () => { stop = true; };
  }, []);
  return data;
}
