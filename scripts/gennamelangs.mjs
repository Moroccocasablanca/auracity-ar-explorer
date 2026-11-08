// The AI decides in which language the NAME of each venue is pronounced (Italian name -> Italian, French -> French, English -> English...).
// Writes src/data/name-langs.json. Safe to run again: it only classifies names that are not in the file yet.
import fs from "node:fs";

const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.split("=")[0], l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const KEY = fs.readFileSync(process.env.HOME + "/.auracity-gemini-key", "utf8").replace(/\s/g, "");
const OUT = "src/data/name-langs.json";
const LANGS = ["it", "en", "fr", "de", "es", "ar", "ro", "sq", "hi"];
const have = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const rows = await (await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/nodes?select=name&kind=eq.business&limit=1000`, { headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY } })).json();
const names = [...new Set(rows.map((r) => r.name))].filter((n) => !(n in have));
console.log(`${names.length} names to classify`);

for (let i = 0; i < names.length; i += 60) {
  const batch = names.slice(i, i + 60);
  const prompt = `Per ogni nome di locale (bar, ristorante, negozio) di Bra, in Piemonte, dimmi in QUALE LINGUA va pronunciato il nome, come lo pronuncerebbe un madrelingua: un nome italiano (parole italiane, cognomi, nomi di persona o di luogo italiani, dialetto piemontese) va letto in italiano ("it"); un nome francese in francese ("fr"); inglese ("en"); spagnolo o catalano ("es"); tedesco ("de"); e così via. Nel dubbio scegli "it". Lingue ammesse: ${LANGS.join(", ")}.
Nomi:\n${batch.map((n, k) => `${k + 1}. ${n}`).join("\n")}`;
  let out = null;
  for (const model of ["gemini-3.5-flash", "gemini-3.1-flash-lite"]) {
    for (let t = 0; t < 2 && !out; t++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": KEY, "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, lang: { type: "STRING" } }, required: ["name", "lang"] } } } }),
      });
      const j = await r.json().catch(() => ({}));
      const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (r.ok && txt) { try { out = JSON.parse(txt); } catch { /* retry */ } }
      if (!out) await new Promise((res) => setTimeout(res, 3000));
    }
    if (out) break;
  }
  if (!out) { console.log("the AI did not answer, run again"); process.exit(1); }
  for (const { name, lang } of out) if (batch.includes(name) && LANGS.includes(lang)) have[name] = lang;
}
fs.writeFileSync(OUT, JSON.stringify(Object.fromEntries(Object.entries(have).sort(([a], [b]) => a.localeCompare(b))), null, 1) + "\n");
const counts = {};
for (const l of Object.values(have)) counts[l] = (counts[l] ?? 0) + 1;
console.log("done", counts);
for (const [n, l] of Object.entries(have)) if (l !== "it") console.log(" ", l, n);
