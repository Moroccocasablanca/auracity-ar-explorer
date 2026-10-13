// What is allowed to notify the user. Nothing is sent just because you walk past: the user chooses.
// - only venues, restaurants and gyms can notify, and only the ones you follow
// - monuments and talking gardens never notify
// - at most a few notifications a day, and never the same place twice in a day
import { useEffect, useState } from "react";
import { followOpts } from "@/services/notifications/follow";

const PREFS = "aura_notify_prefs";
const LOG = "aura_notified";
const EVENT = "aura-notify-prefs";

export type Prefs = { maxPerDay: number };
const DEFAULTS: Prefs = { maxPerDay: 5 };

export const getPrefs = (): Prefs => {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(PREFS) ?? "{}") as Partial<Prefs>) };
  } catch {
    return DEFAULTS;
  }
};
export function setPrefs(p: Partial<Prefs>) {
  localStorage.setItem(PREFS, JSON.stringify({ ...getPrefs(), ...p }));
  window.dispatchEvent(new Event(EVENT));
}
export function usePrefs() {
  const [p, setP] = useState<Prefs>(DEFAULTS);
  useEffect(() => {
    const read = () => setP(getPrefs());
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, []);
  return p;
}

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
type Log = { day: string; ids: string[] };
const readLog = (): Log => {
  try {
    const l = JSON.parse(localStorage.getItem(LOG) ?? "null") as Log | null;
    return l && l.day === today() ? l : { day: today(), ids: [] };
  } catch {
    return { day: today(), ids: [] };
  }
};

/** May this venue alert me because I am walking past it? Only venues I follow with "nearby" on, a few times a day. */
export function mayNotify(id: string): boolean {
  const p = getPrefs();
  const log = readLog();
  if (log.ids.includes(id) || log.ids.length >= p.maxPerDay) return false;
  return followOpts(id)?.nearby === true;
}
export function markNotified(id: string) {
  const log = readLog();
  if (!log.ids.includes(id)) localStorage.setItem(LOG, JSON.stringify({ day: log.day, ids: [...log.ids, id] }));
}
export const notifiedToday = () => readLog().ids.length;
