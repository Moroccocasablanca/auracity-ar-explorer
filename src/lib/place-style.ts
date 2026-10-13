// One look per kind of place, so a café, a bar and a restaurant (or a church and a palace) are never confused on the map.
import type { NodeRow } from "./nodes";
import type { TKey } from "./i18n";

export type PlaceStyleKey = "restaurant" | "streetfood" | "cafe" | "icecream" | "bar" | "church" | "palace" | "museum" | "shop";

export const PLACE_STYLE: Record<PlaceStyleKey, { color: string; label: TKey; symbol: string }> = {
  restaurant: { color: "#f97316", label: "ps.restaurant", symbol: '<path d="M9 6v4c0 1.5 3 1.5 3 0V6m-1.5 0v10M16 6c-1.6 1.6-1.6 4.4 0 5v5"/>' },
  streetfood: { color: "#ef4444", label: "ps.streetfood", symbol: '<path d="M6 8c3.5-2.3 8.5-2.3 12 0L12 18 6 8Zm4 2.2h.01m3 0h.01M12 13h.01"/>' },
  cafe: { color: "#92400e", label: "ps.cafe", symbol: '<path d="M7 9.5h8v3.5a4 4 0 0 1-8 0V9.5Zm8 1h1.4a1.6 1.6 0 0 1 0 3.2H15M9 5.5c0 .9.8.9.8 1.8M12 5.5c0 .9.8.9.8 1.8"/>' },
  icecream: { color: "#ec4899", label: "ps.icecream", symbol: '<path d="M8.5 11.5h7L12 18l-3.5-6.5ZM8.5 11.5a3.5 3.5 0 1 1 7 0"/>' },
  bar: { color: "#be185d", label: "ps.bar", symbol: '<path d="M8 6h8l-1 4a3 3 0 0 1-6 0L8 6Zm4 7v4m-2.5 0h5"/>' },
  church: { color: "#8b5cf6", label: "ps.church", symbol: '<path d="M12 4v3.2m-1.5-1.6h3M8 18v-6l4-3 4 3v6M6.5 18h11M12 18v-3"/>' },
  palace: { color: "#f59e0b", label: "ps.palace", symbol: '<path d="M6 18v-8h2V8h2v2h4V8h2v2h2v8M5.5 18h13M10.5 18v-3.2a1.5 1.5 0 0 1 3 0V18"/>' },
  museum: { color: "#06b6d4", label: "ps.museum", symbol: '<path d="M6 9l6-3.5L18 9M7.5 10.5v5.5m3-5.5v5.5m3-5.5v5.5m3-5.5v5.5M6 17.5h12"/>' },
  shop: { color: "#0ea5e9", label: "ps.shop", symbol: '<path d="M7 9h10l-.8 8H7.8L7 9Zm2.5 0V8a2.5 2.5 0 0 1 5 0v1"/>' },
};

export function placeStyleKey(n: Pick<NodeRow, "kind" | "venue_type" | "name">): PlaceStyleKey {
  if (n.kind === "monument") {
    if (/chiesa|santuario|cappella|duomo|basilica|parrocchia/i.test(n.name)) return "church";
    if (/museo|craveri/i.test(n.name)) return "museum";
    return "palace";
  }
  switch (n.venue_type) {
    case "restaurant": return "restaurant";
    case "fast_food": return "streetfood";
    case "cafe": return "cafe";
    case "ice_cream": return "icecream";
    case "bar":
    case "pub": return "bar";
    default: return "shop";
  }
}

export const placeStyle = (n: Pick<NodeRow, "kind" | "venue_type" | "name">) => PLACE_STYLE[placeStyleKey(n)];
