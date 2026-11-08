import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n";

// Translations of outside texts into the visitor's language, asked once to our server (AI) and remembered here too.
const mem = new Map<string, string>();
const KEY = "aura_translations_v1";
let loaded = false;
const load = () => {
  if (loaded) return;
  loaded = true;
  try { for (const [k, v] of Object.entries(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, string>)) mem.set(k, v); } catch { /* none yet */ }
};
const save = () => {
  try {
    const entries = [...mem.entries()].slice(-400);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch { /* full or private mode */ }
};
const keyOf = (lang: string, t: string) => `${lang}\u0000${t}`;
const inflight = new Map<string, Promise<void>>();

/** The text in the visitor's language when it is already known (or the text itself otherwise). */
export function knownTranslation(text: string, lang: Lang, from: Lang = "it"): string {
  if (lang === from || !text.trim()) return text;
  load();
  return mem.get(keyOf(lang, text)) ?? text;
}

/** Translates the texts (never throws: if the translator is not reachable the original texts come back). */
export async function translateTexts(texts: string[], lang: Lang, from: Lang = "it"): Promise<string[]> {
  if (lang === from) return texts;
  load();
  const need = [...new Set(texts.filter((t) => t.trim() && !mem.has(keyOf(lang, t))))];
  if (need.length) {
    const id = `${lang}|${need.join("\u0001")}`;
    let p = inflight.get(id);
    if (!p) {
      p = (async () => {
        try {
          const r = await fetch("/api/translate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ texts: need, lang }) });
          if (!r.ok) return;
          const j = (await r.json()) as { texts?: string[]; limited?: boolean };
          if (j.limited) return;
          need.forEach((t, i) => { const tr = j.texts?.[i]; if (tr && tr !== t) mem.set(keyOf(lang, t), tr); });
          save();
        } catch { /* offline */ }
      })().finally(() => inflight.delete(id));
      inflight.set(id, p);
    }
    await p;
  }
  return texts.map((t) => mem.get(keyOf(lang, t)) ?? t);
}

/** React: the texts in the visitor's language; the originals show until the translation arrives. */
export function useTranslated(texts: string[], lang: Lang, from: Lang = "it"): string[] {
  const sig = texts.join("\u0001");
  const [out, setOut] = useState<string[]>(() => texts.map((t) => knownTranslation(t, lang, from)));
  useEffect(() => {
    let stop = false;
    const src = sig.split("\u0001");
    setOut(src.map((t) => knownTranslation(t, lang, from)));
    if (lang !== from) void translateTexts(src, lang, from).then((r) => { if (!stop) setOut(r); });
    return () => { stop = true; };
  }, [sig, lang, from]);
  return useMemo(() => (out.length === texts.length ? out : texts), [out, texts]);
}
