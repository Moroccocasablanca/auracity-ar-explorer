// Turns written text into text that sounds right when read aloud: no "barra", no letters-by-letters abbreviations,
// and sentence splitting that does not break on "a.C.", "S. Chiara" or "n. 5".
import type { Lang } from "@/lib/i18n";

const ORD_IT = ["", "primo", "secondo", "terzo", "quarto", "quinto", "sesto", "settimo", "ottavo", "nono", "decimo", "undicesimo", "dodicesimo", "tredicesimo", "quattordicesimo", "quindicesimo", "sedicesimo", "diciassettesimo", "diciottesimo", "diciannovesimo", "ventesimo", "ventunesimo"];
const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
const roman = (s: string) => [...s].reduce((n, c, i, a) => (ROMAN[c]! < (ROMAN[a[i + 1] ?? ""] ?? 0) ? n - ROMAN[c]! : n + ROMAN[c]!), 0);
const FEMALE_SAINTS = /^(chiara|maria|rita|anna|lucia|caterina|teresa|agnese|agata|barbara|cecilia|marta|giulia|margherita|rosalia)$/i;

export function speechText(input: string, lang: Lang = "it"): string {
  const it = lang === "it";
  let t = (input ?? "")
    .replace(/\\n|\\r|\\t/g, " ") // literal "\n" stored in the database text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\p{Extended_Pictographic}|[★☆•▶➤☎]/gu, " ");
  // Centuries written with Roman numerals: "XVIII secolo" / "secolo XVIII"
  t = t.replace(/\b([IVXL]{1,6})\s+(secolo|sec\.)/gi, (m, r: string, w: string) => (it && /^[IVXL]+$/.test(r) && roman(r) <= 21 ? `${ORD_IT[roman(r)]} ${w.toLowerCase().startsWith("sec.") ? "secolo" : "secolo"}` : m));
  t = t.replace(/\b(secolo|sec\.)\s+([IVXL]{1,6})\b/gi, (m, _w: string, r: string) => (it && roman(r) <= 21 ? `secolo ${ORD_IT[roman(r)]}` : m));
  if (it) {
    t = t
      // keep the full stop when the abbreviation also ends the sentence
      .replace(/\ba\.\s?C\.(?=\s+[A-ZÀ-Ý]|\s*$)/g, "avanti Cristo.")
      .replace(/\bd\.\s?C\.(?=\s+[A-ZÀ-Ý]|\s*$)/g, "dopo Cristo.")
      .replace(/\ba\.\s?C\./g, "avanti Cristo")
      .replace(/\bd\.\s?C\./g, "dopo Cristo")
      .replace(/\bsec\./gi, "secolo")
      .replace(/\bca\./gi, "circa")
      .replace(/\becc\.(?=\s+[A-ZÀ-Ý]|\s*$)/gi, "eccetera.")
      .replace(/\becc\./gi, "eccetera")
      .replace(/\bn\.\s?(?=\d)/gi, "numero ")
      .replace(/\bS\.\s+([A-ZÀ-Ý][\p{L}']+)/gu, (_m, name: string) => `${FEMALE_SAINTS.test(name) ? "Santa" : "San"} ${name}`)
      .replace(/\bSS\.\s+/g, "Santissima ");
  } else {
    t = t.replace(/\ba\.\s?C\./g, "BC").replace(/\bd\.\s?C\./g, "AD");
  }
  t = t
    .replace(/\s*&\s*/g, it ? " e " : " and ")
    .replace(/(\d)\s?%/g, it ? "$1 per cento" : "$1 percent")
    .replace(/(\d)\s?€|€\s?(\d+)/g, (_m, a: string, b: string) => `${a ?? b} euro`)
    .replace(/(\d)\s?°/g, it ? "$1 gradi" : "$1 degrees")
    .replace(/\s*[/\\|]\s*/g, ", ")
    .replace(/\s*[–—]\s*/g, ", ")
    .replace(/\s*·\s*/g, ", ")
    .replace(/[()[\]{}]/g, ", ")
    .replace(/[*#_~<>=^`]/g, " ")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/,\s*,+/g, ", ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([.!?]),\s*/g, "$1 ")
    .replace(/\.\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
  return t;
}

const ABBR = new Set(["s", "sant", "sig", "sigg", "dott", "prof", "ing", "arch", "avv", "sec", "ca", "ecc", "cfr", "n", "nn", "p", "pp", "fig", "vol", "tel", "gen", "col", "mons", "sr", "dr", "mr", "mrs", "st", "no", "vs", "eg", "ie"]);

/** Splits into sentences without cutting at abbreviations or initials. */
export function splitSentences(text: string): string[] {
  const t = text.replace(/\s+/g, " ").trim();
  const out: string[] = [];
  let start = 0;
  const re = /[.!?…]+(?=\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const end = m.index + m[0].length;
    const word = (t.slice(start, m.index).match(/(\p{L}+)$/u)?.[1] ?? "").toLowerCase();
    const next = t.slice(end).trimStart()[0];
    if (m[0] === "." && (ABBR.has(word) || word.length === 1)) continue;
    if (next && /[a-zà-ÿ]/.test(next)) continue; // a lowercase letter means the sentence goes on
    out.push(t.slice(start, end).trim());
    start = end;
  }
  if (start < t.length) out.push(t.slice(start).trim());
  return out.filter(Boolean);
}

const STOP: Partial<Record<Lang, string>> = {
  it: "il lo la le gli un una di che è e per con non sono come ma più ci questo questa dei della delle nel nella anche ho hai ha siamo vi qui là ciao buon oggi",
  en: "the a an of that is and for with not are as but more this these in on it you your have has we here there hello good today to be was",
  es: "el la los las un una de que es y para con no son como pero más este esta en por hola buen hoy del al",
  fr: "le la les un une de que est et pour avec ne pas sont comme mais plus ce cette dans sur bonjour bon aujourd du des au",
  de: "der die das ein eine von dass ist und für mit nicht sind wie aber mehr dies in auf hallo guten heute zu den dem",
  ro: "și în de la cu nu sunt ca dar mai acest această pe pentru bună azi un o",
};
/** Which language a written message is in (people write in Italian, English...). Falls back to the app language. */
export function detectTextLang(text: string, fallback: Lang): Lang {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (words.length < 3) return fallback;
  let best: Lang = fallback;
  let bestScore = 0;
  let second = 0;
  for (const [lang, list] of Object.entries(STOP) as [Lang, string][]) {
    const set = new Set(list.split(" "));
    const score = words.filter((w) => set.has(w)).length / words.length;
    if (score > bestScore) {
      second = bestScore;
      bestScore = score;
      best = lang;
    } else if (score > second) second = score;
  }
  return bestScore >= 0.12 && bestScore > second * 1.4 ? best : fallback;
}

/** Node texts exist in Italian and English; other app languages show English unless an AI translation was loaded. */
export const contentLang = (appLang: Lang, translated = false): Lang => (appLang === "it" ? "it" : translated ? appLang : "en");

/** A piece of text with the language it must be pronounced in. */
export type Segment = { text: string; lang: Lang };
export type Speakable = string | Segment[];

const NAME_WORDS: Partial<Record<Lang, string>> = {
  en: "pub house kitchen burger grill street garden club coffee roasters bakery diner steakhouse tavern inn lounge shop",
  fr: "bistrot bistro brasserie chez boulangerie patisserie pâtisserie maison petit petite grande auberge",
  de: "haus bier stube hof biergarten wirtshaus gasthaus bäckerei",
  es: "taberna bodega tapas cervecería mesón",
};
/** Which language a place name is pronounced in. Monuments, churches and gardens are ALWAYS Italian; a venue keeps its own
 *  language when the name is clearly foreign ("Harry's Bar", "Bistrot", "Chez Marie"), otherwise it is Italian. */
export function nameLanguage(name: string, kind: string = "business"): Lang {
  if (kind !== "business") return "it";
  if (/[\u0600-\u06FF]/.test(name)) return "ar";
  if (/\b\p{L}+['’]s\b/u.test(name)) return "en";
  if (/ñ/i.test(name)) return "es";
  if (/[äöüß]/i.test(name)) return "de";
  if (/[çœ]/i.test(name)) return "fr";
  const words = new Set(name.toLowerCase().match(/[\p{L}]+/gu) ?? []);
  for (const [lang, list] of Object.entries(NAME_WORDS) as [Lang, string][]) if (list.split(" ").some((w) => words.has(w))) return lang;
  return "it";
}

/** Makes sure a sentence ends with a full stop, so the voice never swallows the last syllable (e.g. "birra" → "bir"). */
export function ensureEnding(text: string): string {
  const t = text.trim();
  return t && !/[.!?…:;]$/.test(t) ? `${t}.` : t;
}

/** The place name is read with its own pronunciation (Italian for monuments), the explanation in the reader's language. */
export function nameThenText(name: string, body: string, bodyLang: Lang, nameLang: Lang = "it"): Speakable {
  if (bodyLang === nameLang) return `${name}. ${body}`;
  return [{ text: `${name}.`, lang: nameLang }, { text: body, lang: bodyLang }];
}

/** "Welcome! I'm {name}." with the name spoken in Italian. `tpl` is the translated sentence rendered with a "§" placeholder. */
export function greetingWithName(tpl: string, name: string, uiLang: Lang, rest: string, nameLang: Lang = "it"): Speakable {
  if (uiLang === nameLang) return tpl.replace("§", name) + " " + rest;
  const [before = "", after = ""] = tpl.split("§");
  return [
    ...(before.trim() ? [{ text: before.trim(), lang: uiLang }] : []),
    { text: name, lang: nameLang },
    { text: `${after} ${rest}`.trim(), lang: uiLang },
  ];
}

export const speakableIsEmpty = (x: Speakable) => (typeof x === "string" ? !x.trim() : x.every((p) => !p.text.trim()));
