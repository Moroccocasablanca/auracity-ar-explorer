// Pharmacy on duty today (night, weekends, holidays). The server finds and reads the official ASL calendar by itself (see api/pharmacy-duty).
import { useEffect, useState } from "react";
import { SERVICES, type ServicePlace } from "./services";

export type DutyRow = { date: string; day: string | null; night: string | null; dayTown: string | null; nightTown: string | null };
export type DutyData = { status: "ok"; today: DutyRow; yesterday: DutyRow | null; source: string; calendar: string } | { status: "pending" } | { status: "unavailable"; calendar: string };
export type DutyNow = { kind: "day" | "night"; name: string; town: string | null; hours: string; active: boolean; place?: ServicePlace | undefined };

const clean = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, " ").replace(/\b(farmacia|la|dr|dott|di|del|dell|dei|snc|sas|srl)\b\.?/g, " ").replace(/[^a-zà-ú ]/g, " ").replace(/\s+/g, " ").trim();

/** The pharmacy on our map that has this name (OpenStreetMap names differ a little from the calendar's), or nothing if it is outside Bra. */
export function matchPharmacy(name: string, town?: string | null): ServicePlace | undefined {
  if (town && !/^bra$/i.test(town.trim())) return undefined;
  const n = clean(name);
  if (!n) return undefined;
  return SERVICES.filter((s) => s.type === "pharmacy" && s.name).find((s) => {
    const m = clean(s.name!);
    return m && (m.includes(n) || n.includes(m));
  });
}

/** Today's duty entries, with the one that is open right now marked (night 19:30-08:30 belongs to the evening it starts). */
export function dutyNow(d: Extract<DutyData, { status: "ok" }>, now = new Date()): DutyNow[] {
  const mins = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false }).format(now).replace(":", "")) ;
  const minutes = Math.floor(mins / 100) * 60 + (mins % 100);
  const out: DutyNow[] = [];
  const sunday = new Date(`${d.today.date}T12:00:00Z`).getUTCDay() === 0;
  const dayHours = sunday ? "08:30-19:30" : "12:30-15:30";
  const [from, to] = sunday ? [8.5 * 60, 19.5 * 60] : [12.5 * 60, 15.5 * 60];
  if (d.today.day) out.push({ kind: "day", name: d.today.day, town: d.today.dayTown, hours: dayHours, active: minutes >= from && minutes < to, place: matchPharmacy(d.today.day, d.today.dayTown) });
  if (d.yesterday?.night && minutes < 8.5 * 60) out.push({ kind: "night", name: d.yesterday.night, town: d.yesterday.nightTown, hours: "19:30-08:30", active: true, place: matchPharmacy(d.yesterday.night, d.yesterday.nightTown) });
  if (d.today.night) out.push({ kind: "night", name: d.today.night, town: d.today.nightTown, hours: "19:30-08:30", active: minutes >= 19.5 * 60, place: matchPharmacy(d.today.night, d.today.nightTown) });
  return out;
}

/** Loads today's duty list and keeps it fresh (the server may need a minute the first time it reads the calendar). */
export function useDuty(): DutyData | null {
  const [data, setData] = useState<DutyData | null>(null);
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const r = await fetch("/api/pharmacy-duty");
        const j = (await r.json()) as DutyData;
        if (stop) return;
        setData(j);
        timer = setTimeout(load, j.status === "pending" ? 6_000 : 30 * 60_000);
      } catch {
        if (!stop) timer = setTimeout(load, 60_000);
      }
    };
    void load();
    return () => { stop = true; clearTimeout(timer); };
  }, []);
  return data;
}
