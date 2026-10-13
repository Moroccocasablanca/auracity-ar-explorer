// B2B services for venues: profile, flash promos with an automatic spoken announcement, and a small dashboard.
// In this test version everything is kept on the phone; with the venue subscription the same data lives in the database.
import { useEffect, useState } from "react";

export type MerchantGenderVoice = "MALE" | "FEMALE";

export interface MerchantProfile {
  venueId: string;
  venueName: string;
  category: "BAR" | "RESTAURANT" | "GYM" | "SHOP";
  selectedVoice: MerchantGenderVoice; // whether a man or a woman appears / speaks for the venue
  has3DMenu: boolean;
}

export interface FlashPromo {
  promoId: string;
  venueId: string;
  rawTextFromOwner: string; // e.g. "Caffè + brioche a 1.50€"
  aiGeneratedAudioResponse: string; // the spoken announcement, generated automatically
  durationMinutes: number; // how long the offer lasts (e.g. 30)
  active: boolean;
}

export interface MerchantDashboard {
  venueId: string;
  totalArViews: number;
  voiceReviewsListened: number;
  promosRedeemed: number;
}

const PROMOS = "aura_flash_promos";
const STATS = "aura_merchant_stats";
const EVENT = "aura-flash";

type StoredPromo = FlashPromo & { startedAt: number };

const readPromos = (): StoredPromo[] => {
  try {
    return JSON.parse(localStorage.getItem(PROMOS) ?? "[]") as StoredPromo[];
  } catch {
    return [];
  }
};
const readStats = (): Record<string, Omit<MerchantDashboard, "venueId">> => {
  try {
    return JSON.parse(localStorage.getItem(STATS) ?? "{}") as Record<string, Omit<MerchantDashboard, "venueId">>;
  } catch {
    return {};
  }
};

/** The announcement the venue "says": built from the owner's text. (A real AI voice can replace this template.) */
export function composeFlashAudio(raw: string, venueName: string, minutes: number): string {
  const text = raw.trim().replace(/\s*€\s*/g, " euro ").replace(/(\d),(\d)/g, "$1 virgola $2").replace(/(\d)\.(\d)/g, "$1 virgola $2");
  return `Offerta lampo da ${venueName}! ${text}. Solo per i prossimi ${minutes} minuti: vieni adesso!`;
}

export function launchPromo(venueId: string, venueName: string, rawText: string, durationMinutes: number): FlashPromo {
  const p: StoredPromo = {
    promoId: `fp-${Date.now()}`,
    venueId,
    rawTextFromOwner: rawText.trim(),
    aiGeneratedAudioResponse: composeFlashAudio(rawText, venueName, durationMinutes),
    durationMinutes,
    active: true,
    startedAt: Date.now(),
  };
  localStorage.setItem(PROMOS, JSON.stringify([p, ...readPromos().filter((x) => x.venueId !== venueId)].slice(0, 30)));
  window.dispatchEvent(new Event(EVENT));
  return p;
}

export function stopPromo(venueId: string) {
  localStorage.setItem(PROMOS, JSON.stringify(readPromos().filter((x) => x.venueId !== venueId)));
  window.dispatchEvent(new Event(EVENT));
}

/** The promo still running for a venue (null once its time is over), with the minutes left. */
export function activePromo(venueId: string): (FlashPromo & { minutesLeft: number }) | null {
  const p = readPromos().find((x) => x.venueId === venueId);
  if (!p) return null;
  const left = p.durationMinutes - (Date.now() - p.startedAt) / 60_000;
  if (left <= 0) return null;
  return { ...p, active: true, minutesLeft: Math.ceil(left) };
}

export const venuesWithPromo = (): string[] => readPromos().filter((p) => p.durationMinutes - (Date.now() - p.startedAt) / 60_000 > 0).map((p) => p.venueId);

export function useFlash(venueId: string) {
  const [promo, setPromo] = useState<(FlashPromo & { minutesLeft: number }) | null>(null);
  useEffect(() => {
    const read = () => setPromo(activePromo(venueId));
    read();
    window.addEventListener(EVENT, read);
    const id = window.setInterval(read, 20_000);
    return () => {
      window.removeEventListener(EVENT, read);
      window.clearInterval(id);
    };
  }, [venueId]);
  return promo;
}

export type StatKey = keyof Omit<MerchantDashboard, "venueId">;
export function bump(venueId: string, key: StatKey) {
  const all = readStats();
  const cur = all[venueId] ?? { totalArViews: 0, voiceReviewsListened: 0, promosRedeemed: 0 };
  all[venueId] = { ...cur, [key]: cur[key] + 1 };
  localStorage.setItem(STATS, JSON.stringify(all));
  window.dispatchEvent(new Event(EVENT));
}
export const dashboardFor = (venueId: string): MerchantDashboard => ({ venueId, totalArViews: 0, voiceReviewsListened: 0, promosRedeemed: 0, ...readStats()[venueId] });
export function useDashboard(venueId: string): MerchantDashboard {
  const [d, setD] = useState<MerchantDashboard>(() => ({ venueId, totalArViews: 0, voiceReviewsListened: 0, promosRedeemed: 0 }));
  useEffect(() => {
    const read = () => setD(dashboardFor(venueId));
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, [venueId]);
  return d;
}
