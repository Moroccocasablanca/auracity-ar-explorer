// Natural voice on demand: text in, Google Gemini voice out. Every clip is generated once and kept on disk, so the same
// sentence never costs twice. Needs GEMINI_API_KEY on the server (locally it is read from ~/.auracity-gemini-key).
import { createFileRoute } from "@tanstack/react-router";

const VOICES = { female: "Kore", male: "Charon", young: "Puck" } as const;
const MODEL = "gemini-2.5-flash-preview-tts";
const MAX_CHARS = 700;
const MAX_PER_DAY = 300;
let day = "";
let count = 0;

function wav(pcm: Buffer) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
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
        if (!key) return Response.json({ error: "no key" }, { status: 503 });
        let body: { text?: string; voice?: string };
        try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
        const text = String(body.text ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
        const voice = (body.voice && body.voice in VOICES ? body.voice : "male") as keyof typeof VOICES;
        if (!text) return Response.json({ error: "empty" }, { status: 400 });

        const dir = path.join(process.cwd(), ".voice-cache");
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${crypto.createHash("sha256").update(`${MODEL}|${voice}|${text}`).digest("hex")}.wav`);
        if (fs.existsSync(file)) return new Response(new Uint8Array(fs.readFileSync(file)), { headers: { "content-type": "audio/wav" } });

        const today = new Date().toISOString().slice(0, 10);
        if (day !== today) { day = today; count = 0; }
        if (++count > MAX_PER_DAY) return Response.json({ error: "daily limit" }, { status: 429 });

        const style = voice === "young" ? "Leggi in italiano con voce giovane, curiosa e allegra, naturale: " : "Leggi in italiano con voce calda, naturale e cordiale, come un oste simpatico che accoglie un cliente, ritmo tranquillo: ";
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": key, "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: style + text }] }],
            generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICES[voice] } } } },
          }),
        });
        const j = (await res.json()) as { candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] };
        const b64 = j.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!res.ok || !b64) return Response.json({ error: "tts failed" }, { status: res.status === 429 ? 429 : 502 });
        const out = wav(Buffer.from(b64, "base64"));
        fs.writeFileSync(file, out);
        return new Response(new Uint8Array(out), { headers: { "content-type": "audio/wav" } });
      },
    },
  },
});
