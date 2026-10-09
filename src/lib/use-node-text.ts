import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "./i18n";
import { description, history, promo, tagline, type NodeRow } from "./nodes";
import { nodeText } from "./translate.functions";

/** Node texts in the current app language (AI translation for languages beyond IT/EN). */
export function useNodeText(node: NodeRow) {
  const { lang } = useI18n();
  const fetchText = useServerFn(nodeText);
  const base = {
    name: node.name,
    tagline: tagline(node, lang),
    description: description(node, lang),
    history: history(node, lang),
    promo: promo(node, lang),
  };
  const needs = lang !== "it" && lang !== "en";
  const { data } = useQuery({
    queryKey: ["node-text", node.id, lang],
    queryFn: () => fetchText({ data: { nodeId: node.id, lang } }),
    enabled: needs,
    staleTime: Infinity,
  });
  return needs && data ? data : base;
}
