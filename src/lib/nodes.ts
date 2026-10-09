import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Hours } from "./geo";
import type { Lang } from "./i18n";

export type NodeRow = Tables<"nodes">;
export type MenuItem = { name: string; price: number };
export type NodeKind = NodeRow["kind"];

export const KINDS: NodeKind[] = ["business", "monument", "street", "service"];

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
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("node_id", nodeId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

export const reviewsQuery = (nodeId: string) =>
  queryOptions({
    queryKey: ["reviews", nodeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("node_id", nodeId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

export const nodeHours = (n: NodeRow) => n.hours as Hours;
export const nodeMenu = (n: NodeRow) => (n.menu as MenuItem[] | null) ?? [];
export const tagline = (n: NodeRow, lang: Lang) => (lang === "it" ? n.tagline_it : n.tagline_en);
export const description = (n: NodeRow, lang: Lang) => (lang === "it" ? n.description_it : n.description_en);
export const promo = (n: NodeRow, lang: Lang) => (lang === "it" ? n.promo_it : n.promo_en);
