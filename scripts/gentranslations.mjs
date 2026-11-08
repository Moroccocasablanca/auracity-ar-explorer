// Translates every app text that is still missing in the foreign languages (es, fr, de, ar, ro, sq, hi) with the AI, so tourists
// do not see English halfway through. Safe to run again: it only fills what is missing and checks that {placeholders} survive.
//   bun run scripts/gentranslations.mjs            all languages
//   bun run scripts/gentranslations.mjs de fr      only these
import fs from "node:fs";
import { dict } from "../src/lib/i18n.tsx";

const KEY = fs.readFileSync(process.env.HOME + "/.auracity-gemini-key", "utf8").replace(/\s/g, "");
const NAMES = { es: "Spanish", fr: "French", de: "German", ar: "Arabic", ro: "Romanian", sq: "Albanian", hi: "Hindi" };
const MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
const want = process.argv.slice(2).filter((l) => l in NAMES);
const langs = want.length ? want : Object.keys(NAMES);
const en = dict.en;
const ph = (s) => (s.match(/\{[a-zA-Z]+\}|§/g) ?? []).sort().join("|");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ask(lang, batch) {
  const prompt = `Translate these user-interface texts of a city-guide app for the town of Bra (Piedmont, Italy) from English to ${NAMES[lang]}. Natural, short, friendly, suitable for tourists and children.
Rules: keep placeholders exactly as written ({n}, {name}, {a}, § ...), keep the names AURACITY, Bra, Slow Food, Cheese, Comune di Bra, Wi-Fi, AR, QR as they are, keep emojis and punctuation style, do not add explanations. Return one item per key.
${batch.map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join("\n")}`;
  for (const model of MODELS) {
    for (let t = 0; t < 2; t++) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": KEY, "content-type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: { type: "ARRAY", items: { type: "OBJECT", properties: { key: { type: "STRING" }, text: { type: "STRING" } }, required: ["key", "text"] } } } }),
          signal: AbortSignal.timeout(120_000),
        });
        const j = await r.json().catch(() => ({}));
        const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (r.ok && txt) return JSON.parse(txt);
      } catch { /* retry */ }
      await sleep(4000);
    }
  }
  return null;
}

for (const lang of langs) {
  const file = `src/lib/locales/${lang}.json`;
  const have = JSON.parse(fs.readFileSync(file, "utf8"));
  const missing = Object.entries(en).filter(([k, v]) => typeof v === "string" && !(k in have));
  console.log(`${lang}: ${missing.length} texts to translate`);
  let done = 0;
  for (let i = 0; i < missing.length; i += 45) {
    const batch = missing.slice(i, i + 45);
    const out = await ask(lang, batch);
    if (!out) { console.log(`${lang}: batch ${i} failed, skipping`); continue; }
    for (const { key, text } of out) {
      const src = en[key];
      if (typeof src !== "string" || !text?.trim() || ph(src) !== ph(text)) continue; // never keep a text that lost a placeholder
      have[key] = text.trim();
      done++;
    }
    fs.writeFileSync(file, JSON.stringify(have, null, 2) + "\n");
    await sleep(3000);
  }
  console.log(`${lang}: ${done} translated`);
}
