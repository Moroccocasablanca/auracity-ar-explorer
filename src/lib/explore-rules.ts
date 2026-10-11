import { isGardenObject } from "./node-rules";
import { venueFeaturesEnabled } from "./systemConfig";

type Place = { kind: string; venue_type?: string | null; subscribed?: boolean; garden_interactive: boolean };
export type ExploreFilter = "all" | "restaurants" | "monument" | "gardens" | "business";

export function isRestaurant(n: Pick<Place, "kind" | "venue_type">) {
  return n.kind === "business" && (n.venue_type === "restaurant" || n.venue_type === "fast_food");
}

export function matchesExploreFilter(n: Place, filter: ExploreFilter) {
  if (n.kind === "street") return false;
  if (filter === "restaurants") return isRestaurant(n);
  if (filter === "gardens") return isGardenObject(n);
  if (filter === "all") return n.kind === "business" || n.kind === "monument" || isGardenObject(n);
  return n.kind === filter;
}

export function explorePriority(n: Place) {
  if (n.kind === "business" && venueFeaturesEnabled(Boolean(n.subscribed))) return 0;
  if (isRestaurant(n)) return 1;
  if (n.kind === "monument") return 2;
  if (isGardenObject(n)) return 3;
  return 4;
}