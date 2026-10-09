// Server-only: node texts in any app language. IT/EN come from the node; others are AI-translated once and cached.
import type { Tables } from "@/integrations/supabase/types";
import type { Lang } from "./i18n";
import { streamResponseText } from "./gateway.server";

type Node = Tables<"nodes">;
export type NodeText = { name: string; tagline: string; description: string; history: string; promo: string | null };

const LANG_NAME: Record<Lang, string> = {
  it: "Italian", en: "English", es: "Spanish", fr: "French", de: "German", ar: "Arabic", ro: "Romanian", sq: "Albanian", hi: "Hindi",
};

export function baseText(n: Node, lang: "it" | "en"): NodeText {
  return lang === "it"
    ? { name: n.name, tagline: n.tagline_it, description: n.description_it, history: n.history_it, promo: n.promo_it }
    : { name: n.name, tagline: n.tagline_en, description: n.description_en, history: n.history_en, promo: n.promo_en };
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "tagline", "description", "history", "promo"],
  properties: {
    name: { type: "string" },
    tagline: { type: "string" },
    description: { type: "string" },
    history: { type: "string" },
    promo: { type: "string" },
  },
};

export async function localizedNode(n: Node, lang: Lang): Promise<NodeText> {
  if (lang === "it" || lang === "en") return baseText(n, lang);
  const src = baseText(n, "en");
  const hash = JSON.stringify(src);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("node_translations")
    .select("*")
    .eq("node_id", n.id)
    .eq("lang", lang)
    .maybeSingle();
  if (row && row.source_hash === hash) return { ...row, promo: row.promo };

  const res = await streamResponseText({
    model: "openai/gpt-6-astra",
    reasoning: { effort: "low" },
    instructions: `Translate every field from English to ${LANG_NAME[lang]}. Keep proper names of places recognisable. Keep facts and dates exactly. Empty fields stay empty.`,
    input: [{ role: "user", content: JSON.stringify({ ...src, promo: src.promo ?? "" }) }],
    text: { format: { type: "json_schema", name: "node_text", strict: true, schema: SCHEMA } },
  });
  if (!res.ok) return src;
  try {
    const out = JSON.parse(res.text) as NodeText;
    const value = { ...out, promo: out.promo || null };
    await supabaseAdmin.from("node_translations").upsert({ node_id: n.id, lang, ...value, source_hash: hash });
    return value;
  } catch {
    return src;
  }
}
