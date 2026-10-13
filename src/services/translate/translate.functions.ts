import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LANGS } from "@/lib/i18n";
import type { NodeText } from "@/services/translate/translate.server";

export const nodeText = createServerFn({ method: "POST" })
  .inputValidator((d: { nodeId: string; lang: string }) =>
    z.object({ nodeId: z.string().uuid(), lang: z.enum(LANGS) }).parse(d),
  )
  .handler(async ({ data }): Promise<NodeText | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: node } = await supabaseAdmin.from("nodes").select("*").eq("id", data.nodeId).maybeSingle();
    if (!node) return null;
    const { localizedNode } = await import("@/services/translate/translate.server");
    return localizedNode(node, data.lang);
  });
