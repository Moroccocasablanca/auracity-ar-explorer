import spots from "@/data/fun-spots.json";
import type { NodeRow } from "@/lib/nodes";

type Spot = { id: string; kind: "bench" | "tree"; name: string; lat: number; lng: number; text: string };

/** Fun talking benches and trees for kids (riddles, jokes, curiosities). The places are real benches and trees from OpenStreetMap; the texts are written once by the AI (scripts/genfun.mjs). */
export const FUN_PREFIX = "fun-";
export const isFunNode = (n: { id: string }) => n.id.startsWith(FUN_PREFIX);

export const FUN_NODES: NodeRow[] = (spots as Spot[]).map((s) => ({
  id: `${FUN_PREFIX}${s.id}`,
  slug: `${FUN_PREFIX}${s.id}`.replace(/_/g, "-"),
  kind: s.kind,
  name: s.name,
  address: "Bra",
  city: "Bra",
  lat: s.lat,
  lng: s.lng,
  radius_m: 30,
  garden_interactive: true, // shown as a talking character on the map; messages are switched off for these (no account needed to listen)
  description_it: s.text,
  description_en: s.text,
  history_it: s.text,
  history_en: s.text,
  history_sources: [],
  tagline_it: s.kind === "tree" ? "Un albero che fa ridere e pensare" : "Una panchina piena di sorprese",
  tagline_en: s.kind === "tree" ? "A tree that makes you laugh and think" : "A bench full of surprises",
  hours: null,
  menu: null,
  menu_source_url: null,
  menu_updated_at: null,
  image_url: null,
  image_credit: null,
  osm_id: null,
  promo_it: null,
  promo_en: null,
  specials_it: null,
  specials_en: null,
  subscribed: false,
  venue_type: null,
  created_at: "2026-10-20T00:00:00Z",
}));
