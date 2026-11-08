// Natural voice on demand: text in, Google Gemini voice out. Every clip is generated once and kept on disk, so the same
// sentence never costs twice. Needs GEMINI_API_KEY on the server (locally it is read from ~/.auracity-gemini-key).
import { createFileRoute } from "@tanstack/react-router";

const VOICES = { female: "Kore", male: "Charon", young: "Puck" } as const;
// Every model has its own free daily quota: when one is used up the next one takes over (the voices have the same names).
const MODELS = ["gemini-2.5-flash-preview-tts", "gemini-3.1-flash-tts-preview", "gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts", "gemini-2.5-pro-preview-tts"];
let firstModel = 0;
const MAX_CHARS = 700;
const LANG_NAMES: Record<string, string> = { it: "Italian", en: "English", fr: "French", de: "German", es: "Spanish", ar: "Arabic", ro: "Romanian", sq: "Albanian", hi: "Hindi" };
// Tells the voice which language it reads, so Italian is pronounced as Italian (the "ch" of Duchessa as K, double consonants held) and a French name as French.
const LOCALE: Record<string, string> = { it: "it-IT", en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-US", ar: "ar-EG", ro: "ro-RO", hi: "hi-IN" };
const MAX_PER_DAY = 1500; // the free fallback voice has no quota: this only stops a runaway loop
let day = "";
let count = 0;

function wav(pcm: Buffer) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}


// When every Gemini model has used its free quota (it happens most days) the app must not fall back to an old recording or a robot voice:
// the free Microsoft neural voices (edge-tts, installed on the Mac in ~/Documents/StudioVideo/venv) take over, same three characters.
const EDGE: Record<string, { female: string; male: string; young: string }> = {
  it: { female: "it-IT-ElsaNeural", male: "it-IT-DiegoNeural", young: "it-IT-IsabellaNeural" },
  en: { female: "en-US-AriaNeural", male: "en-US-GuyNeural", young: "en-US-AnaNeural" },
  fr: { female: "fr-FR-DeniseNeural", male: "fr-FR-HenriNeural", young: "fr-FR-EloiseNeural" },
  de: { female: "de-DE-KatjaNeural", male: "de-DE-ConradNeural", young: "de-DE-AmalaNeural" },
  es: { female: "es-ES-ElviraNeural", male: "es-ES-AlvaroNeural", young: "es-ES-ElviraNeural" },
  ar: { female: "ar-EG-SalmaNeural", male: "ar-EG-ShakirNeural", young: "ar-EG-SalmaNeural" },
  ro: { female: "ro-RO-AlinaNeural", male: "ro-RO-EmilNeural", young: "ro-RO-AlinaNeural" },
  sq: { female: "sq-AL-AnilaNeural", male: "sq-AL-IlirNeural", young: "sq-AL-AnilaNeural" },
  hi: { female: "hi-IN-SwaraNeural", male: "hi-IN-MadhurNeural", young: "hi-IN-SwaraNeural" },
};
async function edgeVoice(text: string, voice: "female" | "male" | "young", lang: string): Promise<Buffer | null> {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const { execFile } = await import("node:child_process");
  const bin = process.env["EDGE_TTS_BIN"] ?? path.join(os.homedir(), "Documents/StudioVideo/venv/bin/edge-tts");
  const ffmpeg = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"].find((f) => fs.existsSync(f)) ?? "ffmpeg";
  if (!fs.existsSync(bin)) return null;
  const v = (EDGE[lang] ?? EDGE["it"]!)[voice];
  const tmp = path.join(os.tmpdir(), `aura-edge-${process.pid}-${Date.now()}`);
  const run = (cmd: string, args: string[]) => new Promise<boolean>((ok) => execFile(cmd, args, { timeout: 25_000 }, (e) => ok(!e)));
  try {
    const extra = voice === "young" ? ["--pitch=+6Hz", "--rate=+4%"] : [];
    if (!(await run(bin, ["--voice", v, "--text", text, ...extra, "--write-media", `${tmp}.mp3`]))) return null;
    // same format as the Gemini clips (24 kHz mono wav), so the cache, the "ready" check and the player stay identical
    if (!(await run(ffmpeg, ["-v", "error", "-y", "-i", `${tmp}.mp3`, "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", `${tmp}.wav`]))) return null;
    return fs.readFileSync(`${tmp}.wav`);
  } catch {
    return null;
  } finally {
    for (const ext of [".mp3", ".wav"]) try { fs.unlinkSync(tmp + ext); } catch { /* already gone */ }
  }
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const os = await import("node:os");
        const crypto = await import("node:crypto");
        let key = process.env["GEMINI_API_KEY"] ?? "";
        if (!key) {
          try { key = fs.readFileSync(path.join(os.homedir(), ".auracity-gemini-key"), "utf8").replace(/\s/g, ""); } catch { /* no local key */ }
        }
        let body: { text?: string; voice?: string; lang?: string };
        try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
        const text = String(body.text ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
        const lang = body.lang && body.lang in LANG_NAMES ? body.lang : "it";
        const voice = (body.voice && body.voice in VOICES ? body.voice : "male") as keyof typeof VOICES;
        if (!text) return Response.json({ error: "empty" }, { status: 400 });

        const dir = path.join(process.env["DATA_DIR"] ?? process.cwd(), ".voice-cache");
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${crypto.createHash("sha256").update(`v2|${voice}|${lang}|${text}`).digest("hex")}.wav`);
        if (fs.existsSync(file)) return new Response(new Uint8Array(fs.readFileSync(file)), { headers: { "content-type": "audio/wav" } });

        const today = new Date().toISOString().slice(0, 10);
        if (day !== today) { day = today; count = 0; }
        if (++count > MAX_PER_DAY) return Response.json({ error: "daily limit" }, { status: 429 });

        // Only the written text goes to the voice: the voice itself (woman, man, young) is chosen by its name, so nothing
        // like "narrate with an elegant female voice" can ever be read aloud.
        const body2 = JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { ...(LOCALE[lang] ? { languageCode: LOCALE[lang] } : {}), voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICES[voice] } } } },
        });
        let b64: string | undefined;
        let lastStatus = 502;
        for (let i = 0; key && i < MODELS.length && !b64; i++) {
          const idx = (firstModel + i) % MODELS.length;
          try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELS[idx]}:generateContent`, { method: "POST", headers: { "x-goog-api-key": key, "content-type": "application/json" }, body: body2 });
            lastStatus = res.status;
            const j = (await res.json()) as { candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] };
            b64 = res.ok ? j.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data : undefined;
            if (b64) firstModel = idx; // start from the model that works next time
          } catch {
            /* next model */
          }
        }
        let out: Buffer;
        if (b64) out = wav(Buffer.from(b64, "base64"));
        else {
          const edge = await edgeVoice(text, voice, lang);
          if (!edge) return Response.json({ error: "tts failed" }, { status: lastStatus === 429 ? 429 : 502 });
          out = edge;
        }
        fs.writeFileSync(file, out);
        return new Response(new Uint8Array(out), { headers: { "content-type": "audio/wav" } });
      },
    },
  },
});
