// Everything a visitor writes or says (and everything the AI writes for children) must be CLEAN: no bad words or insults, no phone numbers, links or social names,
// no appointments between strangers, nothing violent, sexual or hateful. These are the strict rules; the AI checks the rest.
// The word lists match the START of words (so "stronzo" and "stronzate" both match) and also catch tricks: capitals, accents, "m e r d a", "m3rd4", "merrrda".

export type CleanVerdict = { ok: true } | { ok: false; reason: "profanity" | "contact" | "meetup" | "unsafe" };

/** lowercase, no accents, letters instead of look-alike digits and symbols, repeated letters squeezed */
function plain(text: string): string {
  const map: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i", "€": "e" };
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[01345$7@!€]/g, (c) => map[c] ?? c)
    .replace(/(\p{L})\1{2,}/gu, "$1$1");
}
/** the same text with the spaces and dots between single letters removed ("m e r d a" -> "merda") */
const glued = (t: string) => t.replace(/\b(\p{L})(?:[\s.\-_*]+(?=\p{L}\b))/gu, "$1").replace(/[^\p{L}\s]/gu, "");

// Stems match at the START of a word (so "stronzo" and "stronzate" both match, but "significa" never matches "fica").
const BAD_STEMS = [
  // Italian
  "merd", "cazz", "stronz", "vaffanc", "fanculo", "puttan", "troia", "troie", "mignott", "minchi", "coglion", "figa", "culo", "culat", "bastard", "pirla", "idiot", "stupid", "cretin", "imbecill", "deficient", "scemo", "scema", "mongol", "spastic", "handicappat", "rincoglion", "testa di c", "sborr", "pompin", "bocchin", "segaiol", "scopar", "trombar", "inculat", "frocio", "ricchion", "terron", "zingar", "negro", "nazis", "hitler", "fascist",
  "ammazz", "uccid", "uccider", "sparar", "stupr", "violent", "suicid", "sangue", "morire", "sesso", "sessual", "porno", "nudo", "nuda", "droga", "cocain", "hashish", "spinell", "eroina", "sballo", "ubriac",
  // English
  "fuck", "shit", "bitch", "asshole", "dick", "pussy", "cunt", "slut", "whore", "nigg", "fagg", "retard", "porn", "rape", "cocaine", "drunk",
  // French, Spanish, German
  "merde", "putain", "salope", "connard", "encul", "mierda", "puta", "joder", "cabron", "pendej", "hijo de", "scheiss", "arschloch", "fotze", "hurensohn", "wichser",
];
// short words that must match as a WHOLE word
const BAD_WHOLE = ["cul", "sex", "kill", "ass", "porco", "porca", "pene", "tette", "seno", "uccisi", "morte", "nazi", "die"];
const squeeze = (t: string) => t.replace(/(\p{L})\1+/gu, "$1");
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const STEM_RES = BAD_STEMS.map((w) => new RegExp(`(^|[^\\p{L}])${esc(squeeze(w))}`, "u"));
const WHOLE = new Set(BAD_WHOLE.map(squeeze));

const NUMBER_WORDS = /\b(zero|uno|due|tre|quattro|cinque|sei|sette|otto|nove|one|two|three|four|five|six|seven|eight|nine)\b/g;
const SOCIAL = /(whats\s?app|telegram|instagram|insta\b|snap\s?chat|tik\s?tok|facebook|messenger|discord|youtube|twitter|signal\b|onlyfans|\bdm\b|\bpm\b|\bmail\b|e-?mail|gmail|hotmail|\bcom\b|\bit\b\/)/;
const MEETUP = /(ci vediamo|vediamoci|incontriamoci|ci incontriamo|ci troviamo|troviamoci|appuntament|ti aspett|vi aspett|ti vengo a prendere|vieni da me|vieni a casa|a casa mia|casa mia|passa da me|scrivimi|scrivetemi|chiamami|chiamatemi|contattami|contattatemi|messaggiami|il mio numero|mio numero|mia mail|meet me|see you at|see you tonight|call me|text me|my number|dm me|ritrovo|stasera alle|domani alle|\balle ore\b|\bore \d|\balle \d|\bat \d)/;

export function cleanCheck(text: string): CleanVerdict {
  const raw = String(text ?? "");
  const p = plain(raw);
  const g = plain(glued(raw));
  // contacts: links, emails, handles, long numbers, spelled-out numbers, social networks
  if (/(https?:|www\.|\.com|\.it\b|\.net|\.org|\b[a-z0-9._-]+@[a-z0-9.-]+)/i.test(raw) || /@\w{3,}/.test(raw)) return { ok: false, reason: "contact" };
  if (SOCIAL.test(p) || SOCIAL.test(g)) return { ok: false, reason: "contact" };
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length >= 6 || /\+\s?\d{2}/.test(raw) || /\b\d{3}[\s.\-/]?\d{3,}/.test(raw)) return { ok: false, reason: "contact" };
  if ((p.match(NUMBER_WORDS)?.length ?? 0) >= 6) return { ok: false, reason: "contact" };
  if (MEETUP.test(p)) return { ok: false, reason: "meetup" };
  // bad words, insults, hate, violence, sex, drugs (also when the letters are spaced out or repeated)
  for (const t of [squeeze(p), squeeze(g)]) {
    if (STEM_RES.some((re) => re.test(t))) return { ok: false, reason: "profanity" };
    if (t.split(/[^\p{L}]+/u).some((w) => WHOLE.has(w))) return { ok: false, reason: "profanity" };
  }
  return { ok: true };
}

export const isClean = (text: string) => cleanCheck(text).ok;
