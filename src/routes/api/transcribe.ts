// Turns a short voice recording into text (for dictating a question to the guide). The audio is sent to Google Gemini, never stored.
import { createFileRoute } from "@tanstack/react-router";

const MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
const MAX_BYTES = 4 * 1024 * 1024; // about two minutes of speech
const ALLOWED = /^audio\/(mp4|m4a|x-m4a|aac|mpeg|mp3|wav|x-wav|webm|ogg|flac)/i;

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const type = (request.headers.get("content-type") ?? "").split(";")[0]!.trim();
        if (!ALLOWED.test(type)) return Response.json({ error: "Unsupported audio" }, { status: 415 });
        const audio = Buffer.from(await request.arrayBuffer());
        if (audio.length < 800) return Response.json({ text: "" });
        if (audio.length > MAX_BYTES) return Response.json({ error: "Audio too long" }, { status: 413 });

        let key = process.env["GEMINI_API_KEY"] ?? "";
        if (!key) {
          try {
            const fs = await import("node:fs");
            const path = await import("node:path");
            const os = await import("node:os");
            key = fs.readFileSync(path.join(os.homedir(), ".auracity-gemini-key"), "utf8").replace(/\s/g, "");
          } catch { /* no local key */ }
        }
        if (!key) return Response.json({ error: "AI not configured" }, { status: 500 });

        const body = JSON.stringify({
          contents: [{ parts: [
            { text: "Trascrivi alla lettera le parole dette in questo audio, nella lingua parlata. Rispondi SOLO con la trascrizione, senza commenti, virgolette o spiegazioni. Se non senti parole, rispondi con una risposta vuota." },
            { inlineData: { mimeType: type.replace("x-m4a", "mp4").replace("m4a", "mp4"), data: audio.toString("base64") } },
          ] }],
          generationConfig: { temperature: 0 },
        });
        for (const model of MODELS) {
          try {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
              method: "POST",
              headers: { "x-goog-api-key": key, "content-type": "application/json" },
              body,
              signal: AbortSignal.timeout(30_000),
            });
            if (!r.ok) continue;
            const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
            const text = (j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "").trim();
            return Response.json({ text: text.slice(0, 1000) });
          } catch { /* try the next model */ }
        }
        return Response.json({ error: "Could not transcribe" }, { status: 502 });
      },
    },
  },
});
