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


type Clip = { bytes: Uint8Array; type: string; ext: string };

/** Tries the narration providers in order and returns the first clip: Lovable AI gateway, then ElevenLabs, then OpenAI.
 *  Optional providers only run when their key is set as a server secret (ELEVENLABS_API_KEY / OPENAI_API_KEY). */
async function synthesize(text: string, style: string, voice: "female" | "male"): Promise<Clip | null> {
  const lovable = process.env["LOVABLE_API_KEY"];
  if (lovable) {
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovable}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          contents: [{ role: "user", parts: [{ text: style + text }] }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICES[voice] } } } },
          stream_format: "audio",
        }),
      });
      if (res.ok) return { bytes: new Uint8Array(await res.arrayBuffer()), type: "audio/wav", ext: "wav" };
      console.error("tts lovable status", res.status);
    } catch (e) {
      console.error("tts lovable", e);
    }
  }
  const eleven = process.env["ELEVENLABS_API_KEY"];
  if (eleven) {
    try {
      const id = voice === "female" ? "21m00Tcm4TlvDq8ikWAM" : "pNInz6obpgDQGcFmaJgB";
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": eleven, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35 } }),
      });
      if (res.ok) return { bytes: new Uint8Array(await res.arrayBuffer()), type: "audio/mpeg", ext: "mp3" };
      console.error("tts elevenlabs status", res.status);
    } catch (e) {
      console.error("tts elevenlabs", e);
    }
  }
  const openai = process.env["OPENAI_API_KEY"];
  if (openai) {
    try {
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${openai}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: voice === "female" ? "nova" : "onyx", input: text, instructions: style, response_format: "mp3" }),
      });
      if (res.ok) return { bytes: new Uint8Array(await res.arrayBuffer()), type: "audio/mpeg", ext: "mp3" };
      console.error("tts openai status", res.status);
    } catch (e) {
      console.error("tts openai", e);
    }
  }
  return null;
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
      const { shortStory } = await import("./nodes");
      text = `${loc.name}. ${shortStory(loc.history || loc.description)}`;
      style =
        node.kind === "bench" || node.kind === "tree"
          ? "Tell this like a warm, expressive storyteller, as a tour guide would: natural adult voice, calm pace, a gentle smile, in the language of the text: "
          : "Narrate clearly and warmly, like an expert local guide, in the language of the text: ";
    }
    const { speechText } = await import("./text-speech");
    text = speechText(text, data.lang);
    if (!text.trim()) return { ok: false };

    const key = await sha(`${MODEL}|${data.voice}|${style}|${text}`);
    const { data: cachedRow } = await supabaseAdmin.from("voice_cache").select("path").eq("key", key).maybeSingle();
    let path = cachedRow?.path ?? "";
    if (!path) {
      const clip = await synthesize(text, style, data.voice);
      if (!clip) return { ok: false };
      path = `${key}.${clip.ext}`;
      const up = await supabaseAdmin.storage.from("voices").upload(path, clip.bytes, { contentType: clip.type, upsert: true });
      if (up.error) {
        console.error(up.error);
        return { ok: false };
      }
      await supabaseAdmin.from("voice_cache").upsert({ key, path });
    }
    const { data: signed } = await supabaseAdmin.storage.from("voices").createSignedUrl(path, 60 * 60 * 24);
    return signed?.signedUrl ? { ok: true, url: signed.signedUrl } : { ok: false };
  });
