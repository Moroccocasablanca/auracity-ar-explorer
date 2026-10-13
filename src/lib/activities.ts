// Sport and free-time places around Bra (OpenStreetMap data, © OpenStreetMap contributors, ODbL):
// gyms, sports centres, pools, playgrounds... Each one can have its own offers and live classes.
import raw from "@/data/activities.json";
import type { TKey } from "./i18n";
import { getVenueContent, type VenueContent } from "./venue-content";

export type ActivityType = "gym" | "sports" | "pool" | "playground" | "cinema" | "theatre" | "library" | "dance" | "yoga" | "martial" | "culture";
export type ActivityPlace = { id: string; type: ActivityType; name?: string | null; lat: number; lng: number; address?: string; phone?: string; website?: string; hours?: string };

export const ACTIVITIES: ActivityPlace[] = (raw as ActivityPlace[]).map((a) => (a.type === "sports" && /piscin/i.test(a.name ?? "") ? { ...a, type: "pool" as const } : a));

export const ACTIVITY_META: Record<ActivityType, { color: string; label: TKey; symbol: string; minZoom: number }> = {
  gym: { color: "#65a30d", label: "act.gym", symbol: '<path d="M6 9v6M9 7v10M15 7v10M18 9v6M9 12h6"/>', minZoom: 15.5 },
  sports: { color: "#16a34a", label: "act.sports", symbol: '<circle cx="12" cy="12" r="6"/><path d="M6 12h12M12 6c2 2 2 10 0 12M12 6c-2 2-2 10 0 12"/>', minZoom: 16 },
  pool: { color: "#0284c7", label: "act.pool", symbol: '<path d="M5 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 3 2M5 11c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 3 2"/>', minZoom: 15.5 },
  playground: { color: "#ec4899", label: "act.playground", symbol: '<path d="M7 18V7h10v11M7 11h10M10 18v-4M14 18v-4"/>', minZoom: 16 },
  cinema: { color: "#9333ea", label: "act.cinema", symbol: '<path d="M5 10h14v8H5zM5 10l2-4h12l-2 4M9 6l-2 4m6-4-2 4"/>', minZoom: 15.5 },
  theatre: { color: "#a855f7", label: "act.theatre", symbol: '<path d="M7 7h10v5a5 5 0 0 1-10 0V7ZM10 11h.01M14 11h.01M10.5 14c1 .8 2 .8 3 0"/>', minZoom: 15.5 },
  library: { color: "#b45309", label: "act.library", symbol: '<path d="M6 6h5a2 2 0 0 1 2 2v10a2 2 0 0 0-2-2H6V6Zm12 0h-5v12h5V6Z"/>', minZoom: 15.5 },
  dance: { color: "#d946ef", label: "act.dance", symbol: '<path d="M10 17V7l7-1v10M10 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm7-1a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/>', minZoom: 15.5 },
  yoga: { color: "#10b981", label: "act.yoga", symbol: '<circle cx="12" cy="7" r="2"/><path d="M12 9v4M7 12l5 1 5-1M9 18l3-5 3 5"/>', minZoom: 15.5 },
  martial: { color: "#dc2626", label: "act.martial", symbol: '<path d="M8 8l8 8M16 8l-8 8"/>', minZoom: 15.5 },
  culture: { color: "#d97706", label: "act.culture", symbol: '<path d="M12 6l7 4v1H5v-1l7-4ZM7 12v5m5-5v5m5-5v5M5 18h14"/>', minZoom: 15.5 },
};

export const findActivity = (id: string) => ACTIVITIES.find((a) => a.id === id);

const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
const nowMin = () => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  return Number(p.find((x) => x.type === "hour")!.value) * 60 + Number(p.find((x) => x.type === "minute")!.value);
};

export type ClassState = { title: string; start: string; end: string; state: "live" | "soon" | "later" | "done"; minutes: number };

/** Today's classes with their live state: running now, starting soon, later today, or finished. */
export function classesNow(c: VenueContent): ClassState[] {
  const n = nowMin();
  return (c.classes ?? [])
    .filter((k) => /^\d{2}:\d{2}$/.test(k.start) && /^\d{2}:\d{2}$/.test(k.end))
    .map((k) => {
      const s = toMin(k.start), e = toMin(k.end);
      const state: ClassState["state"] = n >= s && n < e ? "live" : n < s ? (s - n <= 60 ? "soon" : "later") : "done";
      return { ...k, state, minutes: state === "live" ? e - n : s - n };
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** The line a gym says to people who follow it or pass by: what is on now, what is next, and the offer. */
export function activityInvite(a: ActivityPlace, fallback: string): string {
  const c = getVenueContent(a.id);
  const cl = classesNow(c);
  const live = cl.find((k) => k.state === "live");
  const next = cl.find((k) => k.state === "soon" || k.state === "later");
  const parts = [live ? `In corso adesso: ${live.title} (fino alle ${live.end}).` : "", next ? `Prossimo corso: ${next.title} alle ${next.start}.` : "", c.offer ?? ""].filter(Boolean);
  return parts.join(" ") || fallback;
}
