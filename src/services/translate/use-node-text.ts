import { useI18n } from "@/lib/i18n";
import { description, history, promo, tagline, type NodeRow } from "@/lib/nodes";
import { isFunNode } from "@/lib/fun-spots";
import { useTranslated } from "@/lib/translate";
import { contentLang } from "@/services/voice/text-speech";
import type { Lang } from "@/lib/i18n";

/** Node texts in the current app language: Italian and English come from the database, every other language is translated by our own translator
 *  (the fun benches and trees for kids only exist in Italian, so they are translated for English too). */
export function useNodeText(node: NodeRow) {
  const { lang } = useI18n();
  const from: Lang = isFunNode(node) ? "it" : lang === "it" ? "it" : "en";
  const base = {
    name: node.name,
    tagline: tagline(node, from),
    description: description(node, from),
    history: history(node, from),
    promo: promo(node, from) ?? "",
  };
  const needs = lang !== from;
  const tr = useTranslated(needs ? [base.tagline, base.description, base.history, base.promo] : [], lang, from);
  const done = needs && tr.length === 4 && (tr[1] !== base.description || tr[0] !== base.tagline);
  const out = needs && tr.length === 4 ? { name: node.name, tagline: tr[0]!, description: tr[1]!, history: tr[2]!, promo: tr[3]! } : base;
  // the voice reads in the language the text really is in
  const speakLang: Lang = needs ? (done ? lang : from) : contentLang(lang);
  return { ...out, speakLang };
}
