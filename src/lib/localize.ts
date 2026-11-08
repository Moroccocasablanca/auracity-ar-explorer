import { translateTexts } from "@/lib/translate";
import { description, history, promo, type NodeRow } from "@/lib/nodes";
import { isFunNode } from "@/lib/fun-spots";
import type { Lang } from "@/lib/i18n";

/** A text in the visitor's language, together with the language it really ended up in (so the voice reads it with the right accent).
 *  If the translator does not answer, the original comes back with its own language. */
export async function localize(text: string, from: Lang, lang: Lang): Promise<{ text: string; lang: Lang }> {
  if (!text.trim() || from === lang) return { text, lang: from };
  const [tr] = await translateTexts([text], lang, from);
  return tr && tr !== text ? { text: tr, lang } : { text, lang: from };
}

/** The story or the invitation of a place in the visitor's language. The database has Italian and English: the English one is translated for the other languages.
 *  The fun benches and trees for kids only exist in Italian: they are translated for everybody else. */
export async function nodeTextIn(n: NodeRow, kind: "story" | "promo", lang: Lang): Promise<{ text: string; lang: Lang }> {
  const pick = (l: Lang) => (kind === "story" ? history(n, l) || description(n, l) : promo(n, l) ?? "");
  if (lang === "it") return { text: pick("it"), lang: "it" };
  const from: Lang = isFunNode(n) ? "it" : "en";
  const src = pick(from);
  if (from === lang) return { text: src, lang };
  return localize(src, from, lang);
}

/** A visitor's message, read in the language the listener chose (messages are written in any language). */
export const messageIn = (body: string, lang: Lang) => localize(body, "it", lang);
