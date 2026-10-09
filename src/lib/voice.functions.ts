import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LANGS } from "./i18n";

// Natural AI narration. Text is always loaded server-side from the node/message so callers
// cannot synthesise arbitrary text; every clip is generated once and cached in storage.
const input = z.object({
  nodeId: z.string().uuid(),
  source: z.enum(["history", "message"]),
  messageId: z.string().uuid().optional(),
  lang: z.enum(LANGS),
  voice: z.enum(["female", "male"]),
});

const VOICES = { female: "Kore", male: "Charon" } as const;
const MODEL = "google/gemini-3.1-flash-tts-preview";

async function sha(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const naturalVoice = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof input>) => input.parse(d))
  .handler(async ({ data }): Promise<{ ok: true; url: string } | { ok: false }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: node } = await supabaseAdmin.from("nodes").select("*").eq("id", data.nodeId).maybeSingle();
    if (!node) return { ok: false };

    let text = "";
    let style = "";
    if (data.source === "message") {
      if (!data.messageId) return { ok: false };
      const { data: rows } = await supabaseAdmin.rpc("public_node_messages", { p_node_id: node.id });
      const msg = rows?.find((m) => m.id === data.messageId);
      if (!msg) return { ok: false };
      text = msg.body;
      style = "Read this short message aloud in its own language, playfully and warmly, like a friendly talking garden character (sing it lightly if it is a song): ";
    } else {
      const { localizedNode } = await import("./translate.server");
      const loc = await localizedNode(node, data.lang);
      text = `${loc.name}. ${loc.history || loc.description}`;
      style = "Narrate clearly and warmly, like an expert local guide, in the language of the text: ";
    }
    if (!text.trim()) return { ok: false };

    const key = await sha(`${MODEL}|${data.voice}|${style}|${text}`);
    const path = `${key}.wav`;
    const { data: cached } = await supabaseAdmin.from("voice_cache").select("path").eq("key", key).maybeSingle();
    if (!cached) {
      const apiKey = process.env["LOVABLE_API_KEY"];
      if (!apiKey) return { ok: false };
      const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          contents: [{ role: "user", parts: [{ text: style + text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICES[data.voice] } } },
          },
          stream_format: "audio",
        }),
      });
      if (!res.ok) {
        console.error("tts status", res.status);
        return { ok: false };
      }
      const audio = new Uint8Array(await res.arrayBuffer());
      const up = await supabaseAdmin.storage.from("voices").upload(path, audio, { contentType: "audio/wav", upsert: true });
      if (up.error) {
        console.error(up.error);
        return { ok: false };
      }
      await supabaseAdmin.from("voice_cache").upsert({ key, path });
    }
    const { data: signed } = await supabaseAdmin.storage.from("voices").createSignedUrl(path, 60 * 60 * 24);
    return signed?.signedUrl ? { ok: true, url: signed.signedUrl } : { ok: false };
  });
