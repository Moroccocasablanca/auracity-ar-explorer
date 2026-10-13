import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Hours } from "@/utils/geo";
import type { Lang } from "./i18n";
import { cleanText } from "./jokes";
import { splitSentences } from "@/services/voice/text-speech";

export type NodeRow = Tables<"nodes">;
export type MenuItem = { name: string; price: number; /** owner's own photo (small data URL); otherwise a standard 3D illustration is used */ img?: string | undefined };
export type NodeKind = NodeRow["kind"];

export const KINDS: NodeKind[] = ["business", "monument", "street", "bench", "tree", "service"];

export const nodesQuery = queryOptions({
  queryKey: ["nodes"],
  queryFn: async () => {
    const { data, error } = await supabase.from("nodes").select("*").order("name");
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60_000,
});

export const messagesQuery = (nodeId: string) =>
  queryOptions({
    queryKey: ["messages", nodeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_node_messages", { p_node_id: nodeId });
      if (error) throw error;
      return data;
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
