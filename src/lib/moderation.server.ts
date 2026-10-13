// Server-only: content guardrails (fast pattern checks + LLM moderation via Lovable AI Gateway).
import { systemConfig } from "./systemConfig";

export type ModerationResult =
  | { ok: true }
  | { ok: false; reason: "personal_data" | "profanity" | "hate" | "spam" | "meetup" | "unavailable" };

const PERSONAL_DATA_PATTERNS = [
  /[\w.+-]+@[\w-]+\.[\w.-]+/i, // email
  /(?:\+?\d[\s().-]?){9,}/, // phone-like digit runs
  /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/i, // IBAN
  /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/i, // Codice fiscale
  /https?:\/\/|www\./i, // links
];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["allowed", "reason"],
  properties: {
    allowed: { type: "boolean" },
    reason: { type: "string", enum: ["ok", "profanity", "hate", "personal_data", "spam", "meetup"] },
  },
};

export async function moderateText(text: string): Promise<ModerationResult> {
  if (PERSONAL_DATA_PATTERNS.some((re) => re.test(text))) {
    return { ok: false, reason: "personal_data" };
  }

  // systemConfig.autoModeration is on: the AI check below is mandatory and fails closed when it is unavailable.
  if (!systemConfig.autoModeration) return { ok: true };
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, reason: "unavailable" };

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "You are a strict content moderator for a public, location-based message board used by families, in any language. " +
          "Block profanity and insults, hate speech, harassment or bullying, sexual content, personal or sensitive data (emails, phone numbers, addresses of private people, social handles, IDs, payment data), and spam or advertising. " +
          "Block with reason 'meetup' any attempt to arrange a meeting, gathering or appointment between people (e.g. 'see you at 6', 'let's meet in the square', a time and place to gather). " +
          "Allow fun and kind content: jokes, everyday stories, greetings, song lyrics or short verses, and generic invitations to come and eat or try a dish (e.g. 'come try the pizza!'). " +
          "Allow ordinary opinions, including honest negative reviews. Answer only with the JSON object.",
        input: [{ role: "user", content: `Text to moderate:\n"""${text}"""` }],
        text: {
          format: { type: "json_schema", name: "moderation", strict: true, schema: SCHEMA },
        },
      }),
    });
    if (!response.ok || !response.body) {
      console.error("moderation gateway status", response.status);
      return { ok: false, reason: "unavailable" };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as { type?: string; delta?: string };
          if (evt.type === "response.output_text.delta" && evt.delta) out += evt.delta;
        } catch {
          /* ignore partial frames */
        }
      }
    }
    const verdict = JSON.parse(out) as { allowed: boolean; reason: string };
    if (verdict.allowed) return { ok: true };
    const reason = verdict.reason === "ok" ? "spam" : verdict.reason;
    return { ok: false, reason: reason as "personal_data" | "profanity" | "hate" | "spam" | "meetup" };
  } catch (e) {
    console.error("moderation failed", e);
    return { ok: false, reason: "unavailable" };
  }
}
