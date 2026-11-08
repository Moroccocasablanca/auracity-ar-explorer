import { createFileRoute } from "@tanstack/react-router";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { supabaseAnon } from "@/services/mcp/supabase";

const LANGS = ["it", "en", "es", "fr", "de", "ar", "ro", "sq", "hi"] as const;
const MAX_MESSAGES = 40;
// The main model first; if Google is busy (503/429) the call is retried at once on the lighter one, so the guide almost never fails.
const MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];

async function geminiKey() {
  let key = process.env["GEMINI_API_KEY"] ?? "";
  if (!key) {
    try {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const os = await import("node:os");
      key = fs.readFileSync(path.join(os.homedir(), ".auracity-gemini-key"), "utf8").replace(/\s/g, "");
    } catch { /* no local key */ }
  }
  return key;
}

function system(lang: string) {
  return `You are the AURACITY guide: a friendly, knowledgeable assistant that can answer ANY question on ANY subject (school and homework, science, history, cooking, health basics, travel, technology, money, work, languages, fun, anything), not only about Bra. Warm, clear, precise. Reply in the language with ISO code "${lang}" unless the user writes in another language.
When the question is about Bra or about places in the app (monuments, places to eat, gardens, services), use the tools to look the place up before stating facts about it; never invent menus, prices, opening hours, phone numbers or history of a specific place. If the app has no data, say so plainly. For everything else, answer from your own knowledge; if you are not sure, or the answer needs live data (today's news, scores, traffic), say so honestly instead of guessing.
Safety first: suggest walking routes on pavements and through gardens, remind users to look up from the phone near roads, and that children should stay with an adult.
Never reveal or ask for personal data. Do not organise meetups between strangers; inviting someone to eat at a venue is fine.
Keep answers short and easy (under ~150 words unless the user asks for more) with markdown lists when useful. When mentioning a place of the app, add a link like [Name](/node/slug).`;
}

export const Route = createFileRoute("/api/guide")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = await geminiKey();
        if (!apiKey) return Response.json({ error: "AI not configured" }, { status: 500 });

        let body: { messages?: UIMessage[]; lang?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request" }, { status: 400 });
        }
        const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
        if (messages.length === 0) return Response.json({ error: "No messages" }, { status: 400 });
        const lang = (LANGS as readonly string[]).includes(body.lang ?? "") ? body.lang! : "en";

        const google = createGoogleGenerativeAI({
          apiKey,
          fetch: async (input, init) => {
            const res = await fetch(input, init);
            if (res.status !== 503 && res.status !== 429) return res;
            const url = String(input instanceof Request ? input.url : input);
            const next = MODELS.find((m) => url.includes(`/models/${m}:`));
            const fallback = MODELS[MODELS.indexOf(next ?? "") + 1];
            return next && fallback ? fetch(url.replace(`/models/${next}:`, `/models/${fallback}:`), init) : res;
          },
        });
        const db = supabaseAnon();

        const result = streamText({
          model: google(MODELS[0]!),
          system: system(lang),
          messages: await convertToModelMessages(messages),
          maxOutputTokens: 4000,
          maxRetries: 1,
          abortSignal: request.signal,
          stopWhen: stepCountIs(50),
          tools: {
            list_places: tool({
              description: "List AURACITY places in Bra, optionally filtered by kind or name text.",
              inputSchema: z.object({
                kind: z.enum(["business", "monument", "street", "service", "bench", "tree"]).optional(),
                search: z.string().optional(),
              }),
              execute: async ({ kind, search }) => {
                let q = db.from("nodes").select("slug, kind, name, tagline_it, tagline_en, address, garden_interactive").order("name").limit(100);
                if (kind) q = q.eq("kind", kind);
                if (search) q = q.ilike("name", `%${search.slice(0, 80)}%`);
                const { data, error } = await q;
                if (error) return { error: "Could not load places" };
                return { places: data ?? [] };
              },
            }),
            get_place: tool({
              description: "Get description, history, opening hours, invitation and today's specials of a place by slug.",
              inputSchema: z.object({ slug: z.string() }),
              execute: async ({ slug }) => {
                const { data, error } = await db
                  .from("nodes")
                  .select("slug, kind, name, address, description_it, description_en, history_it, history_en, promo_it, promo_en, specials_it, specials_en, hours")
                  .eq("slug", slug.slice(0, 120))
                  .maybeSingle();
                if (error) return { error: "Could not load place" };
                return data ? { place: data } : { error: "Place not found" };
              },
            }),
          },
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
