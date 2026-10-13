// One-off: records the Italian stories of monuments, trees and benches with the chosen Gemini voices, so the app can play them without any server.
import fs from "node:fs";
import { execSync } from "node:child_process";
import { shortStory } from "../src/lib/nodes.ts";
import { speechText } from "../src/lib/text-speech.ts";
const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.split("=")[0], l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const K = fs.readFileSync(process.env.HOME + "/.auracity-gemini-key", "utf8").replace(/\s/g, "");
const VOICES = { female: "Kore", young: "Puck" }; // monuments: the woman; garden characters (trees, benches): the young voice
const only = process.argv[2];
const nodes = await (await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/nodes?select=id,name,kind,description_it,history_it&kind=in.(monument,tree,bench)`, { headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY } })).json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const voice of ["female", "young"]) {
  for (const n of nodes.filter((x) => (voice === "female") === (x.kind === "monument"))) {
    const out = `public/audio/${n.id}.m4a`;
    if (fs.existsSync(out)) continue;
    const text = speechText(`${n.name}. ${shortStory(n.history_it || n.description_it)}`, "it");
    if (!text.trim()) continue;
    const style = voice === "young" ? "Racconta in italiano con la voce di un ragazzo giovane, curioso ed entusiasta, allegro ma naturale, non da cartone animato: " : n.kind === "monument" ? "Narra in italiano con voce calda e naturale, come una guida locale esperta, ritmo calmo: " : "Racconta in italiano come un narratore caldo ed espressivo, voce adulta naturale, ritmo calmo, con un leggero sorriso: ";
    for (let attempt = 0; attempt < 6; attempt++) {
      await sleep(attempt ? 30000 : 12000);
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent", {
        method: "POST", headers: { "x-goog-api-key": K, "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: style + text }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICES[voice] } } } } }),
      });
      const j = await r.json();
      const b64 = j?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) { console.log(voice, n.name, "retry", r.status, (j?.error?.message ?? "").slice(0, 90)); if (j?.error?.message?.includes("per day")) process.exit(2); continue; }
      const pcm = Buffer.from(b64, "base64");
      const h = Buffer.alloc(44); h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
      fs.writeFileSync("/tmp/aura-clip.wav", Buffer.concat([h, pcm]));
      execSync(`afconvert -f m4af -d aac -b 48000 /tmp/aura-clip.wav ${out}`);
      console.log(voice, n.name, "ok", fs.statSync(out).size);
      break;
    }
  }
}
fs.writeFileSync("public/audio/manifest.json", JSON.stringify(fs.readdirSync("public/audio").filter((f) => f.endsWith(".m4a")).sort()));
console.log("DONE");
