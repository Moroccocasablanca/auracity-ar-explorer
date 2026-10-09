import { createFileRoute } from "@tanstack/react-router";
import { createAnthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { supabaseAnon } from "@/lib/mcp/supabase";
import { createLovableAiGatewayRunIdFetch, withRunIdHeader } from "@/lib/guide/run-id";

const LANGS = ["it", "en", "es", "fr", "de", "ar", "ro", "sq", "hi"] as const;
const MAX_MESSAGES = 40;

function system(lang: string) {
  return `You are the AURACITY guide for Bra (Piedmont, Italy): warm, concise, precise. Reply in the language with ISO code "${lang}" unless the user writes in another language.
Use the tools to look up places before stating facts about them; never invent menus, prices, opening hours, phone numbers or history. If the app has no data, say so plainly.
Safety first: suggest walking routes on pavements and through gardens, remind users to look up from the phone near roads, and that children should stay with an adult.
Never reveal or ask for personal data. Do not organise meetups between strangers; inviting someone to eat at a venue is fine.
Keep answers short (under ~150 words) with markdown lists when useful. When mentioning a place, add a link like [Name](/node/slug).`;
}

export const Route = createFileRoute("/api/guide")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
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

        const gateway = createLovableAiGatewayRunIdFetch();
        const anthropic = createAnthropic({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: gateway.fetch,
        });
        const db = supabaseAnon();

        const result = streamText({
          model: anthropic("anthropic/claude-sonnet-5"),
          system: system(lang),
          messages: await convertToModelMessages(messages),
          maxOutputTokens: 4000,
          maxRetries: 0,
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

        return withRunIdHeader(result.toUIMessageStreamResponse({ originalMessages: messages }), gateway);
      },
    },
  },
});
