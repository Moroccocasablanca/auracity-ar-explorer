// The guided walk ("Passeggiata"): the monuments of the city in the most convenient walking order,
// starting from where you are. Everything is computed on the phone from the app's own data: no AI, works offline.
import { distanceM, type LatLng } from "@/utils/geo";

export type TourStop<T> = { place: T; legM: number };
export type Tour<T> = { stops: TourStop<T>[]; totalM: number; minutes: number };

const WALK_M_PER_MIN = 75; // about 4.5 km/h, a calm city pace
const LISTEN_MIN = 3; // time to stop and listen to the story at each monument
/** Monuments farther than this from the start are left out: a walk, not a drive. */
export const TOUR_MAX_RADIUS_M = 3000;

/** Nearest-neighbour order from the start, then a quick 2-opt pass that removes the crossings. */
export function buildTour<T extends LatLng>(places: T[], start: LatLng, maxRadiusM = TOUR_MAX_RADIUS_M): Tour<T> {
  const left = places.filter((p) => distanceM(start, p) <= maxRadiusM);
  const order: T[] = [];
  let here: LatLng = start;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) if (distanceM(here, left[i]!) < distanceM(here, left[best]!)) best = i;
    const pick = left.splice(best, 1)[0]!;
    here = pick;
    order.push(pick);
  }
  const pathLen = (o: LatLng[]) => o.reduce((s, p, i) => s + distanceM(i === 0 ? start : o[i - 1]!, p), 0);
  for (let improved = true, guard = 0; improved && guard < 50; guard++) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++)
      for (let j = i + 1; j < order.length; j++) {
        const cand = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
        if (pathLen(cand) + 1 < pathLen(order)) { order.splice(0, order.length, ...cand); improved = true; }
      }
  }
  const stops = order.map((place, i) => ({ place, legM: Math.round(distanceM(i === 0 ? start : order[i - 1]!, place)) }));
  const totalM = stops.reduce((s, x) => s + x.legM, 0);
  return { stops, totalM, minutes: Math.round(totalM / WALK_M_PER_MIN + stops.length * LISTEN_MIN) };
}

/** Walking directions (not driving) to a stop. */
export const walkingUrl = (p: LatLng) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`;

const DONE_KEY = "aura_tour_done_v1";
export function loadDone(): string[] {
  try { const v = JSON.parse(localStorage.getItem(DONE_KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}
export function saveDone(ids: string[]) {
  try { localStorage.setItem(DONE_KEY, JSON.stringify(ids)); } catch { /* private mode: progress is kept only for this visit */ }
}
