import { getPosition } from "suncalc";

export type MapAppearance = "day" | "night";
export type MapMode = "auto" | MapAppearance;

// Use the sun at Bra, not the device timezone or a fixed clock schedule.
export function braMapAppearance(date: Date): MapAppearance {
  return getPosition(date, 44.6985, 7.8538).altitude > -0.833 ? "day" : "night";
}

export function resolveMapAppearance(mode: MapMode, date: Date): MapAppearance {
  return mode === "auto" ? braMapAppearance(date) : mode;
}