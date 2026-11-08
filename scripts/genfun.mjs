// Adds fun talking benches and trees for kids on the map of Bra.
// Real places come from OpenStreetMap (benches and trees that already exist in Bra); the fun texts are written once by the AI.
//   bun run scripts/genfun.mjs      -> writes src/data/fun-spots.json (safe to run again: it keeps the texts it already has)
import fs from "node:fs";

const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.split("=")[0], l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const KEY = fs.readFileSync(process.env.HOME + "/.auracity-gemini-key", "utf8").replace(/\s/g, "");
const OUT = "src/data/fun-spots.json";
const MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
const MAX = 30; // how many fun spots to add
const MIN_GAP = 55; // metres between two spots, so the map stays clean

const dist = (a, b) => {
  const R = 6371000, r = (x) => (x * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const kept = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : [];
if (kept.length) { console.log(`${kept.length} fun spots already exist: nothing to do (delete ${OUT} to make new ones)`); process.exit(0); }

const existing = await (await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/nodes?select=lat,lng`, { headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY } })).json();
const osm = await (await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: { "user-agent": "AURACITY-pilot/1.0", "content-type": "application/x-www-form-urlencoded" },
  body: "data=" + encodeURIComponent('[out:json][timeout:60];(node["natural"="tree"](44.688,7.838,44.708,7.868);node["amenity"="bench"](44.688,7.838,44.708,7.868););out;'),
})).json();

// nearest to the centre first (Piazza Caduti della Liberta), spread out, never on top of an existing talking object
const centre = { lat: 44.6985, lng: 7.8505 };
const picks = [];
for (const e of osm.elements.map((e) => ({ kind: e.tags.natural === "tree" ? "tree" : "bench", lat: e.lat, lng: e.lon, species: e.tags.species ?? e.tags["species:it"] ?? e.tags.genus ?? "" })).sort((a, b) => dist(a, centre) - dist(b, centre))) {
  if (picks.length >= MAX) break;
  if (existing.some((n) => dist(n, e) < 35) || picks.some((p) => dist(p, e) < MIN_GAP)) continue;
  picks.push(e);
}
console.log(`${picks.length} places found (${picks.filter((p) => p.kind === "tree").length} trees, ${picks.filter((p) => p.kind === "bench").length} benches)`);

const TYPES = ["indovinello con la risposta", "barzelletta per bambini", "curiosità sugli animali", "curiosità sugli alberi e le piante", "mini sfida da fare subito qui (sicura, da fermi o con piccoli movimenti)", "il fatto più strano del corpo umano", "domanda 'Sapevi che…?' sullo spazio", "filastrocca di 4 versi"];
const prompt = `Scrivi i testi per ${picks.length} oggetti parlanti di una app per bambini (6-11 anni) a Bra, in Piemonte. Ogni oggetto è una panchina o un albero simpatico che parla in prima persona con voce da bambino curioso, allegro e un po' orgoglioso.
Per ognuno dai: "name" (titolo breve e divertente, max 4 parole, es. "L'albero indovino", "La panchina barzelletta"), "text" (2-4 frasi in italiano, massimo 330 caratteri, da leggere ad alta voce: si presenta con una battuta e poi propone il contenuto).
Contenuti da alternare tra gli oggetti: ${TYPES.join("; ")}.
Regole: SOLO fatti certi e veri; niente storia o informazioni su luoghi reali di Bra; niente cose pericolose (mai correre vicino alla strada, mai arrampicarsi, mai accettare cose da sconosciuti); tono caldo e giocoso; niente emoji; ogni testo diverso dagli altri.
Gli oggetti, in ordine: ${picks.map((p, i) => `${i + 1}) ${p.kind === "tree" ? "albero" : "panchina"}${p.species ? ` (${p.species})` : ""}`).join("; ")}.`;

let list = null;
for (const model of MODELS) {
  for (let t = 0; t < 3 && !list; t++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": KEY, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, text: { type: "STRING" } }, required: ["name", "text"] } } },
      }),
    });
    const j = await r.json().catch(() => ({}));
    const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (r.ok && txt) { try { const a = JSON.parse(txt); if (Array.isArray(a) && a.length >= picks.length) list = a; } catch { /* retry */ } }
    if (!list) await new Promise((res) => setTimeout(res, 3000));
  }
  if (list) break;
}
if (!list) { console.log("The AI did not answer: run again in a moment"); process.exit(1); }

const out = picks.map((p, i) => ({ id: `${p.kind}-${p.lat.toFixed(5)}-${p.lng.toFixed(5)}`.replace(/\./g, "").replace(/-/g, "_"), kind: p.kind, name: String(list[i].name).slice(0, 40), lat: p.lat, lng: p.lng, text: String(list[i].text).slice(0, 400) }));
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`written ${out.length} spots to ${OUT}`);
for (const o of out.slice(0, 4)) console.log("-", o.kind, o.name, "|", o.text);
