import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "@/services/mcp/supabase";

export default defineTool({
  name: "list_places",
  title: "List places in Bra",
  description: "List AURACITY places in Bra (monuments, venues, streets, talking garden benches and trees), optionally filtered by kind or name.",
  inputSchema: {
    kind: z.enum(["business", "monument", "street", "service", "bench", "tree"]).optional().describe("Only places of this kind."),
    search: z.string().trim().max(80).optional().describe("Text contained in the place name."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ kind, search }) => {
    let q = supabaseAnon()
      .from("nodes")
      .select("slug, kind, name, tagline_it, tagline_en, address, lat, lng, garden_interactive")
      .order("name")
      .limit(100);
    if (kind) q = q.eq("kind", kind);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data, error } = await q;
    if (error) throw new ToolError("Could not load places.");
    const places = (data ?? []).map((n) => ({
      slug: n.slug,
      kind: n.kind,
      name: n.name,
      tagline_it: n.tagline_it,
      tagline_en: n.tagline_en,
      address: n.address,
      lat: n.lat,
      lng: n.lng,
      talking_garden_object: n.garden_interactive && (n.kind === "bench" || n.kind === "tree"),
    }));
    return {
      content: [{ type: "text", text: places.map((p) => `${p.name} (${p.kind}) — slug: ${p.slug}`).join("\n") || "No places found." }],
      structuredContent: { places },
    };
  },
});
