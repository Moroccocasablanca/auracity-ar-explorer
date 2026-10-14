// Safety and health services around Bra (OpenStreetMap data, © OpenStreetMap contributors, ODbL).
import raw from "@/data/services.json";
import type { TKey } from "./i18n";

export type ServiceType = "pharmacy" | "hospital" | "clinic" | "police" | "carabinieri" | "fire" | "aed" | "bank" | "post" | "deli" | "wine";
export type ServicePlace = { id: string; type: ServiceType; name?: string | null; lat: number; lng: number; address?: string; phone?: string; hours?: string };

export const SERVICES = raw as ServicePlace[];

// Symbols follow what people already recognise: green Greek cross for pharmacies, blue H for hospitals.
const GREEK = '<path fill="currentColor" stroke="none" d="M9.3 4.5h5.4v4.8h4.8v5.4h-4.8v4.8H9.3v-4.8H4.5V9.3h4.8z"/>';
export const SERVICE_META: Record<ServiceType, { color: string; bg: string; fg: string; label: TKey; symbol: string; icon: string; minZoom?: number }> = {
  pharmacy: { color: "#15803d", bg: "#ffffff", fg: "#16a34a", label: "svc.pharmacy", symbol: GREEK, icon: "pharmacy" },
  hospital: { color: "#1d4ed8", bg: "#1d4ed8", fg: "#ffffff", label: "svc.hospital", symbol: '<path d="M8 6v12M16 6v12M8 12h8" stroke-width="2.6"/>', icon: "hospital" },
  clinic: { color: "#0d9488", bg: "#0d9488", fg: "#ffffff", label: "svc.clinic", symbol: '<path d="M12 6.5v11M6.5 12h11" stroke-width="2.6"/>', icon: "clinic" },
  police: { color: "#1e3a8a", bg: "#1e3a8a", fg: "#ffffff", label: "svc.police", symbol: '<path d="M12 6l5 2v4c0 3-2.2 5-5 6-2.8-1-5-3-5-6V8l5-2Z"/>', icon: "police" },
  carabinieri: { color: "#b91c1c", bg: "#111827", fg: "#ef4444", label: "svc.carabinieri", symbol: '<path fill="currentColor" stroke="none" d="m12 5.5 1.7 4 4.3.4-3.3 2.8 1 4.2L12 14.7 8.3 16.9l1-4.2L6 9.9l4.3-.4L12 5.5Z"/>', icon: "carabinieri" },
  fire: { color: "#ea580c", bg: "#ea580c", fg: "#ffffff", label: "svc.fire", symbol: '<path d="M12 6c1 3 4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 0 1 1 1.5 1.5 1.5C12 10 11 8 12 6Z"/>', icon: "fire" },
  aed: { color: "#e11d48", bg: "#e11d48", fg: "#ffffff", label: "svc.aed", symbol: '<path d="M12 17.5s-5-3.2-5-6.6A2.8 2.8 0 0 1 12 9.2a2.8 2.8 0 0 1 5 1.7c0 3.4-5 6.6-5 6.6Z"/>', icon: "aed" },
  bank: { color: "#ca8a04", bg: "#ca8a04", fg: "#ffffff", label: "svc.bank", symbol: '<path d="M5 9l7-3.5L19 9M7 10.5V16m3.5-5.5V16m3-5.5V16m3.5-5.5V16M5.5 17.5h13"/>', icon: "bank", minZoom: 15.5 },
  post: { color: "#d97706", bg: "#d97706", fg: "#ffffff", label: "svc.post", symbol: '<path d="M5 8h14v9H5zM5 8l7 5 7-5"/>', icon: "post", minZoom: 15.5 },
  deli: { color: "#b45309", bg: "#b45309", fg: "#ffffff", label: "svc.deli", symbol: '<path d="M6 16l12-3V9L6 11v5Zm0 0h12"/>', icon: "deli", minZoom: 16 },
  wine: { color: "#9f1239", bg: "#9f1239", fg: "#ffffff", label: "svc.wine", symbol: '<path d="M8 6h8l-.5 4a3.5 3.5 0 0 1-7 0L8 6Zm4 7.5V18m-2.5 0h5"/>', icon: "wine", minZoom: 16 },
};

/** Essentials are always on the map; defibrillators only when the "Services" filter is open. */
// Banks, post offices, delis and wine shops only show in the "Services" filter and only when zoomed in, so the map stays light.
export const isEssential = (s: ServicePlace) => !["aed", "bank", "post", "deli", "wine"].includes(s.type);

export const directionsUrl = (s: { lat: number; lng: number }) => `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;
