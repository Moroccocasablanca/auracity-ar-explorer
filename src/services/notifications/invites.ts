// What a venue says when you walk past it. Order: text edited by the owner in test mode > the venue's own offer >
// today's specials > a few menu items > a short invitation built from facts we really have.
import type { Lang } from "@/lib/i18n";
import { nodeMenu, promo, specials, type NodeRow } from "@/lib/nodes";
import { cleanText } from "@/lib/jokes";
import { getVenueContent } from "@/lib/venue-content";

const KEY = "aura_invites";

/** Real facts taken from the venues' own websites (never invented dishes). */
const SEED: Record<string, { it: string; en: string }> = {
  bucheria: {
    it: "Cucina sperimentale tra Alpi e Mediterraneo, in Piazza Carlo Alberto 22. Entra a vedere cosa c'è da mangiare oggi!",
    en: "Experimental cuisine between the Alps and the Mediterranean, in Piazza Carlo Alberto 22. Come in and see what's on the table today!",
  },
};

function overrides(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export const getInviteOverride = (nodeId: string) => overrides()[nodeId] ?? "";
export function setInviteOverride(nodeId: string, text: string) {
  const all = overrides();
  if (text.trim()) all[nodeId] = text.trim();
  else delete all[nodeId];
  localStorage.setItem(KEY, JSON.stringify(all));
}

/** The sentence the venue says to someone passing by (without the venue name, which is the notification title). */
export function inviteBody(n: NodeRow, lang: Lang, fallback: string): string {
  const own = getInviteOverride(n.id);
  if (own) return own;
  const vc = getVenueContent(n.id);
  const mine = [vc.specials, vc.offer].filter(Boolean).join(" ");
  if (mine) return mine;
  if (vc.menu?.length) return vc.menu.slice(0, 3).map((m) => m.name).join(", ");
  const offer = cleanText(promo(n, lang));
  if (offer) return offer;
  const today = cleanText(specials(n, lang));
  if (today) return today;
  const items = nodeMenu(n).slice(0, 3).map((m) => m.name).join(", ");
  if (items) return items;
  const seed = SEED[n.slug];
  if (seed) return lang === "it" ? seed.it : seed.en;
  return fallback;
}
