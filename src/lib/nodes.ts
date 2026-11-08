import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Hours } from "@/utils/geo";
import type { Lang } from "./i18n";
import { cleanText } from "./jokes";
import { splitSentences } from "@/services/voice/text-speech";

import { FUN_NODES, FUN_PREFIX } from "@/lib/fun-spots";
export type NodeRow = Tables<"nodes">;
export type MenuItem = { name: string; price: number; /** owner's own photo (small data URL); otherwise a standard 3D illustration is used */ img?: string | undefined };
export type NodeKind = NodeRow["kind"];

export const KINDS: NodeKind[] = ["business", "monument", "street", "bench", "tree", "service"];

const NODES_CACHE = "aura_nodes_cache_v1";
/** The last list of places is kept on the phone: next time the app opens the map is filled at once, then refreshed from the network. */
function saveNodesCache(rows: NodeRow[]) {
  try { localStorage.setItem(NODES_CACHE, JSON.stringify(rows)); } catch { /* private mode or full: no cache */ }
}
export function cachedNodes(): NodeRow[] | undefined {
  try {
    const v = JSON.parse(localStorage.getItem(NODES_CACHE) ?? "null") as NodeRow[] | null;
    return Array.isArray(v) && v.length ? [...v, ...FUN_NODES] : undefined;
  } catch {
    return undefined;
  }
}

export const nodesQuery = queryOptions({
  queryKey: ["nodes"],
  queryFn: async () => {
    const { data, error } = await supabase.from("nodes").select("*").order("name");
    if (error) throw error;
    saveNodesCache(data);
    return [...data, ...FUN_NODES]; // plus the fun benches and trees for kids that live in the app itself
  },
  staleTime: 5 * 60_000,
});

export const messagesQuery = (nodeId: string) =>
  queryOptions({
    queryKey: ["messages", nodeId],
    queryFn: async () => {
      if (nodeId.startsWith(FUN_PREFIX)) return []; // fun spots live in the app: no messages from visitors
      // the messages saved on our own server (benches and trees) and the ones of the database, together, newest first
      const ours = fetch(`/api/bench-messages?node=${encodeURIComponent(nodeId)}`, { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<{ id: string; node_id: string; body: string; created_at: string }[]>) : []))
        .catch(() => []);
      const { data, error } = await supabase.rpc("public_node_messages", { p_node_id: nodeId });
      const mine = await ours;
      if (error && mine.length === 0) throw error;
      return [...mine, ...(data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
  });

export const reviewsQuery = (nodeId: string) =>
  queryOptions({
    queryKey: ["reviews", nodeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_node_reviews", { p_node_id: nodeId });
      if (error) throw error;
      return data;
    },
  });

// Italian for "it", English for every other language (other languages are translated via useNodeText).
const isIt = (lang: Lang) => lang === "it";
export const nodeHours = (n: NodeRow) => n.hours as Hours;
export const nodeMenu = (n: NodeRow) => (n.menu as MenuItem[] | null) ?? [];
/** Short spoken version of a story: the first two sentences, never a long history lecture. */
export function shortStory(text: string | null | undefined, max = 230) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const sentences = splitSentences(clean);
  let out = "";
  for (const s of sentences.slice(0, 3)) {
    if (out && (out + " " + s).length > max) break;
    out += (out ? " " : "") + s;
  }
  return out.trim() || clean;
}

export const tagline = (n: NodeRow, lang: Lang) => (isIt(lang) ? n.tagline_it : n.tagline_en);
export const description = (n: NodeRow, lang: Lang) => cleanText(isIt(lang) ? n.description_it : n.description_en);
export const promo = (n: NodeRow, lang: Lang) => (isIt(lang) ? n.promo_it : n.promo_en);
export const history = (n: NodeRow, lang: Lang) => cleanText(isIt(lang) ? n.history_it : n.history_en);
export const specials = (n: NodeRow, lang: Lang) => (isIt(lang) ? n.specials_it : n.specials_en);
