import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

export default defineTool({
  name: "latest_messages",
  title: "Latest messages at a place",
  description: "Read the most recent anonymous, moderated messages left on a talking garden object or venue in Bra.",
  inputSchema: {
    slug: z.string().trim().min(1).max(120).describe("Place slug from list_places."),
    limit: z.number().int().min(1).max(20).optional().describe("How many messages (default 5)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug, limit }) => {
    const sb = supabaseAnon();
    const { data: node } = await sb.from("nodes").select("id, name").eq("slug", slug).maybeSingle();
    if (!node) throw new ToolError(`No place with slug "${slug}".`);
    const { data, error } = await sb.rpc("public_node_messages", { p_node_id: node.id });
    if (error) throw new ToolError("Could not load messages.");
    const messages = (data ?? []).slice(0, limit ?? 5).map((m) => ({ body: m.body, created_at: m.created_at }));
    return {
      content: [{ type: "text", text: messages.map((m) => `• ${m.body}`).join("\n") || `No messages at ${node.name} yet.` }],
      structuredContent: { place: node.name, messages },
    };
  },
});
