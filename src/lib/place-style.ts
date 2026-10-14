// One look per kind of place, so a café, a bar and a restaurant (or a church and a palace) are never confused on the map.
import type { NodeRow } from "./nodes";
import type { TKey } from "./i18n";

export type PlaceStyleKey = "restaurant" | "streetfood" | "cafe" | "icecream" | "bar" | "church" | "palace" | "museum" | "shop" | "townhall" | "memorial" | "park" | "castle";

export const PLACE_STYLE: Record<PlaceStyleKey, { color: string; label: TKey; symbol: string; icon?: string }> = {
  restaurant: { color: "#f97316", label: "ps.restaurant", symbol: '<path d="M9 6v4c0 1.5 3 1.5 3 0V6m-1.5 0v10M16 6c-1.6 1.6-1.6 4.4 0 5v5"/>', icon: "restaurant" },
  streetfood: { color: "#eab308", label: "ps.streetfood", symbol: '<path d="M6 8c3.5-2.3 8.5-2.3 12 0L12 18 6 8Zm4 2.2h.01m3 0h.01M12 13h.01"/>', icon: "streetfood" },
  cafe: { color: "#78350f", label: "ps.cafe", symbol: '<path d="M7 9.5h8v3.5a4 4 0 0 1-8 0V9.5Zm8 1h1.4a1.6 1.6 0 0 1 0 3.2H15M9 5.5c0 .9.8.9.8 1.8M12 5.5c0 .9.8.9.8 1.8"/>', icon: "cafe" },
  icecream: { color: "#ec4899", label: "ps.icecream", symbol: '<path d="M8.5 11.5h7L12 18l-3.5-6.5ZM8.5 11.5a3.5 3.5 0 1 1 7 0"/>', icon: "icecream" },
  bar: { color: "#be123c", label: "ps.bar", symbol: '<path d="M8 6h8l-1 4a3 3 0 0 1-6 0L8 6Zm4 7v4m-2.5 0h5"/>', icon: "bar" },
  church: { color: "#7c3aed", label: "ps.church", symbol: '<path d="M12 4v3.2m-1.5-1.6h3M8 18v-6l4-3 4 3v6M6.5 18h11M12 18v-3"/>', icon: "church" },
  palace: { color: "#0d9488", label: "ps.palace", symbol: '<path d="M6 18v-8h2V8h2v2h4V8h2v2h2v8M5.5 18h13M10.5 18v-3.2a1.5 1.5 0 0 1 3 0V18"/>', icon: "palace" },
  museum: { color: "#0284c7", label: "ps.museum", symbol: '<path d="M6 9l6-3.5L18 9M7.5 10.5v5.5m3-5.5v5.5m3-5.5v5.5m3-5.5v5.5M6 17.5h12"/>', icon: "museum" },
  townhall: { color: "#4f46e5", label: "ps.townhall", symbol: '<path d="M6 18v-7l6-4 6 4v7M5.5 18h13M9.5 18v-4h5v4"/>', icon: "townhall" },
  memorial: { color: "#64748b", label: "ps.memorial", symbol: '<path d="M12 5v10m-3-7h6M8 18h8M9.5 15h5"/>', icon: "memorial" },
  park: { color: "#15803d", label: "ps.park", symbol: '<path d="M12 5a4 4 0 0 0-4 4 3 3 0 0 0 1 5.5h6A3 3 0 0 0 16 9a4 4 0 0 0-4-4ZM12 14.5V19"/>', icon: "park" },
  castle: { color: "#9a3412", label: "ps.castle", symbol: '<path d="M6 18V8h2v2h2V8h4v2h2V8h2v10M5.5 18h13M10.5 18v-3a1.5 1.5 0 0 1 3 0v3"/>', icon: "castle" },
  shop: { color: "#84cc16", label: "ps.shop", symbol: '<path d="M7 9h10l-.8 8H7.8L7 9Zm2.5 0V8a2.5 2.5 0 0 1 5 0v1"/>', icon: "shop" },
};

export function placeStyleKey(n: Pick<NodeRow, "kind" | "venue_type" | "name">): PlaceStyleKey {
  if (n.kind === "monument") {
    if (/chiesa|santuario|cappella|duomo|basilica|parrocchia/i.test(n.name)) return "church";
    if (/museo|craveri/i.test(n.name)) return "museum";
    if (/comune|municipio|palazzo comunale/i.test(n.name)) return "townhall";
    if (/caduti|monumento|lapide|stele/i.test(n.name)) return "memorial";
    if (/zizzola|giardin|parco|villa comunale/i.test(n.name)) return "park";
    if (/castello|rocca|torre/i.test(n.name)) return "castle";
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
