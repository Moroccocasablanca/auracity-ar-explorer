// Records the Italian stories of monuments, streets, services, trees and benches with the chosen Gemini voices,
// so the app plays them instantly, with no server and no robot voice. Safe to run again: it only records what is missing,
// never overwrites a clip (premium assets are protected), and keeps going when one model's daily quota is used up.
//   monuments, streets, services -> woman (Kore)      trees and benches (garden characters) -> young voice (Puck)
//   bun run scripts/genaudio.mjs          short version of every place (first sentences)
//   bun run scripts/genaudio.mjs --full   COMPLETE historical story of every monument, start to finish -> <id>-full.m4a
import fs from "node:fs";
import { execSync } from "node:child_process";
import { shortStory } from "../src/lib/nodes.ts";
import { speechText } from "../src/services/voice/text-speech.ts";

const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.split("=")[0], l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const KEY = fs.readFileSync(process.env.HOME + "/.auracity-gemini-key", "utf8").replace(/\s/g, "");
const VOICE = { female: "Kore", young: "Puck" };
// Each model has its own free daily quota: when one is used up the next one carries on.
const MODELS = ["gemini-2.5-flash-preview-tts", "gemini-3.1-flash-tts-preview", "gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts", "gemini-2.5-pro-preview-tts"];
// Only the written text is sent: the voice is chosen by its name, so no instruction can ever be read aloud.
const STYLE = { female: "", young: "" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const manifest = () => fs.writeFileSync("public/audio/manifest.json", JSON.stringify(fs.readdirSync("public/audio").filter((f) => f.endsWith(".m4a")).sort()));

const FULL = process.argv.includes("--full");
const nodes = await (await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/nodes?select=id,name,kind,description_it,history_it&kind=in.(monument,street,service,tree,bench)`, { headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY } })).json();
const fileOf = (n) => `public/audio/${n.id}${FULL ? "-full" : ""}.m4a`;
const todo = nodes
  .filter((n) => !FULL || n.kind === "monument")
  .map((n) => ({ n, voice: n.kind === "tree" || n.kind === "bench" ? "young" : "female", text: speechText(`${n.name}. ${FULL ? n.history_it || n.description_it : shortStory(n.history_it || n.description_it)}`, "it") }))
  .filter((x) => x.text.length > 25 && !fs.existsSync(fileOf(x.n)));
console.log(`${todo.length} stories to record`);
let m = 0;
let done = 0;
for (const { n, voice, text } of todo) {
  let ok = false;
  for (let tries = 0; tries < MODELS.length * 2 && !ok; tries++) {
    const model = MODELS[m % MODELS.length];
    await sleep(6000);
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": KEY, "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: STYLE[voice] + text }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE[voice] } } } } }),
    });
    const j = await r.json().catch(() => ({}));
    const b64 = j?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) {
      console.log(`${n.name}: ${model} -> ${r.status}, next model`);
      m++;
      continue;
    }
    const pcm = Buffer.from(b64, "base64");
    const h = Buffer.alloc(44); h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
    fs.writeFileSync("/tmp/aura-clip.wav", Buffer.concat([h, pcm]));
    execSync(`afconvert -f m4af -d aac -b 48000 /tmp/aura-clip.wav ${fileOf(n)}`);
    manifest(); // the app can use every clip as soon as it exists
    console.log(`${voice} ${n.kind} ${n.name} ok (${model})`);
    ok = true;
    done++;
  }
  if (!ok) { console.log("all models are out of quota for today: run again tomorrow"); break; }
}
manifest();
console.log(`DONE ${done}/${todo.length}`);
