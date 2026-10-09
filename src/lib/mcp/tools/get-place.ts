import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

export default defineTool({
  name: "get_place",
  title: "Get place details",
  description: "Get a Bra place's description, history, opening hours and current invitation, in Italian and English.",
  inputSchema: { slug: z.string().trim().min(1).max(120).describe("Place slug from list_places.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => {
    const { data: n, error } = await supabaseAnon()
      .from("nodes")
      .select("slug, kind, name, address, description_it, description_en, history_it, history_en, promo_it, promo_en, specials_it, specials_en, hours, lat, lng")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new ToolError("Could not load the place.");
    if (!n) throw new ToolError(`No place with slug "${slug}".`);
    const hours = n.hours as { open?: string; close?: string; days?: number[] } | null;
    const place = {
      slug: n.slug,
      kind: n.kind,
      name: n.name,
      address: n.address,
      lat: n.lat,
      lng: n.lng,
      description_it: n.description_it,
      description_en: n.description_en,
      history_it: n.history_it,
      history_en: n.history_en,
      invitation_it: n.promo_it,
      invitation_en: n.promo_en,
      specials_it: n.specials_it,
      specials_en: n.specials_en,
      hours: hours ? { open: hours.open ?? null, close: hours.close ?? null, days: hours.days ?? [] } : null,
    };
    return {
      content: [{ type: "text", text: `${n.name}\n${n.description_en}\n${n.history_en}`.trim() }],
      structuredContent: { place },
    };
  },
});
