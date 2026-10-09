import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { distanceM, isOpenNow, romeDate, type Hours } from "./geo";
import { allowsMessages, isGardenObject } from "./node-rules";

export type ActionError =
  | "too_far"
  | "weak_gps"
  | "closed"
  | "bad_receipt"
  | "not_business"
  | "not_found"
  | "personal_data"
  | "profanity"
  | "hate"
  | "spam"
  | "login_required"
  | "unavailable";

export type ActionResult = { ok: true } | { ok: false; error: ActionError | "protected_place"; distance?: number };

const presence = {
  nodeId: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000),
  author: z.string().trim().min(1).max(30),
};

const messageSchema = z.object({
  ...presence,
  body: z.string().trim().min(2).max(280),
});

const reviewSchema = z.object({
  ...presence,
  body: z.string().trim().min(5).max(500),
  rating: z.number().int().min(1).max(5),
  receiptCode: z.string().trim().min(6).max(40),
});

const MAX_ACCURACY_M = 60;

export const postMessage = createServerFn({ method: "POST" })
  .inputValidator((input: z.input<typeof messageSchema>) => messageSchema.parse(input))
  .handler(async ({ data }): Promise<ActionResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { moderateText } = await import("./moderation.server");

    const { data: node } = await supabaseAdmin
      .from("nodes")
      .select("id, kind, lat, lng, radius_m, garden_interactive")
      .eq("id", data.nodeId)
      .maybeSingle();
    if (!node) return { ok: false, error: "not_found" };
    // Bench messages are reserved to registered users (postBenchMessage).
    if (isGardenObject(node)) return { ok: false, error: "login_required" };
    if (!allowsMessages(node)) return { ok: false, error: "protected_place" };

    if (data.accuracy > MAX_ACCURACY_M) return { ok: false, error: "weak_gps" };
    const dist = distanceM({ lat: data.lat, lng: data.lng }, node);
    if (dist > node.radius_m) return { ok: false, error: "too_far", distance: Math.round(dist) };

    const verdict = await moderateText(`${data.author}: ${data.body}`);
    if (!verdict.ok) return { ok: false, error: verdict.reason };

    const { error } = await supabaseAdmin
      .from("messages")
      .insert({ node_id: node.id, author: data.author, body: data.body });
    if (error) {
      console.error(error);
      return { ok: false, error: "unavailable" };
    }
    return { ok: true };
  });

export const postReview = createServerFn({ method: "POST" })
  .inputValidator((input: z.input<typeof reviewSchema>) => reviewSchema.parse(input))
  .handler(async ({ data }): Promise<ActionResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { moderateText } = await import("./moderation.server");

    const { data: node } = await supabaseAdmin
      .from("nodes")
      .select("id, kind, lat, lng, radius_m, hours")
      .eq("id", data.nodeId)
      .maybeSingle();
    if (!node) return { ok: false, error: "not_found" };
    if (node.kind !== "business") return { ok: false, error: "not_business" };

    // Temporal moderation: no commercial reviews while the business is closed.
    if (!isOpenNow(node.hours as Hours)) return { ok: false, error: "closed" };

    if (data.accuracy > MAX_ACCURACY_M) return { ok: false, error: "weak_gps" };
    const dist = distanceM({ lat: data.lat, lng: data.lng }, node);
    if (dist > node.radius_m) return { ok: false, error: "too_far", distance: Math.round(dist) };

    // Receipt must exist for this business and be unused.
    const code = data.receiptCode.toUpperCase();
    const { data: receipt } = await supabaseAdmin
      .from("receipts")
      .select("code, node_id, used_at")
      .eq("code", code)
      .maybeSingle();
    if (!receipt || receipt.node_id !== node.id || receipt.used_at) {
      return { ok: false, error: "bad_receipt" };
    }

    const verdict = await moderateText(`${data.author}: ${data.body}`);
    if (!verdict.ok) return { ok: false, error: verdict.reason };

    // Atomically consume the receipt (only if still unused).
    const { data: consumed } = await supabaseAdmin
      .from("receipts")
      .update({ used_at: new Date().toISOString() })
      .eq("code", code)
      .is("used_at", null)
      .select("code");
    if (!consumed || consumed.length === 0) return { ok: false, error: "bad_receipt" };

    const { error } = await supabaseAdmin
      .from("reviews")
      .insert({ node_id: node.id, author: data.author, rating: data.rating, body: data.body });
    if (error) {
      console.error(error);
      await supabaseAdmin.from("receipts").update({ used_at: null }).eq("code", code);
      return { ok: false, error: "unavailable" };
    }
    return { ok: true };
  });

const benchSchema = z.object({
  ...presence,
  body: z.string().trim().min(2).max(280),
});

// Geotagged messages on benches / street items: registered users only, physically present, AI-moderated.
export const postBenchMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof benchSchema>) => benchSchema.parse(input))
  .handler(async ({ data, context }): Promise<ActionResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { moderateText } = await import("./moderation.server");

    const { data: node } = await supabaseAdmin
      .from("nodes")
      .select("id, kind, lat, lng, radius_m, garden_interactive")
      .eq("id", data.nodeId)
      .maybeSingle();
    if (!node) return { ok: false, error: "not_found" };
    if (!isGardenObject(node)) return { ok: false, error: "protected_place" };
    if (data.accuracy > MAX_ACCURACY_M) return { ok: false, error: "weak_gps" };
    const dist = distanceM({ lat: data.lat, lng: data.lng }, node);
    if (dist > node.radius_m) return { ok: false, error: "too_far", distance: Math.round(dist) };

    const verdict = await moderateText(`${data.author}: ${data.body}`);
    if (!verdict.ok) return { ok: false, error: verdict.reason };

    const { error } = await supabaseAdmin
      .from("messages")
      .insert({ node_id: node.id, author: data.author, body: data.body, user_id: context.userId });
    if (error) {
      console.error(error);
      return { ok: false, error: "unavailable" };
    }
    return { ok: true };
  });

// Automatic daily menu refresh: at most once per day (Europe/Rome) per venue, from its public source page.
export const refreshMenu = createServerFn({ method: "POST" })
  .inputValidator((input: { nodeId: string }) => z.object({ nodeId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<{ updated: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: node } = await supabaseAdmin
      .from("nodes")
      .select("id, kind, menu_source_url, menu_updated_at")
      .eq("id", data.nodeId)
      .maybeSingle();
    if (!node || node.kind !== "business" || !node.menu_source_url) return { updated: false };
    const today = romeDate(new Date());
    if (node.menu_updated_at && romeDate(new Date(node.menu_updated_at)) === today) return { updated: false };

    // Claim today's refresh so concurrent visitors don't trigger duplicate AI calls.
    let claim = supabaseAdmin
      .from("nodes")
      .update({ menu_updated_at: new Date().toISOString() })
      .eq("id", node.id);
    claim = node.menu_updated_at ? claim.eq("menu_updated_at", node.menu_updated_at) : claim.is("menu_updated_at", null);
    const { data: claimed } = await claim.select("id");
    if (!claimed || claimed.length === 0) return { updated: false };

    try {
      const { extractMenuFromUrl } = await import("./menu.server");
      const menu = await extractMenuFromUrl(node.menu_source_url, today);
      if (!menu) return { updated: false };
      await supabaseAdmin
        .from("nodes")
        .update({
          ...(menu.items.length > 0 ? { menu: menu.items } : {}),
          specials_it: menu.specials_it || null,
          specials_en: menu.specials_en || null,
        })
        .eq("id", node.id);
      return { updated: true };
    } catch (e) {
      console.error("menu refresh failed", e);
      return { updated: false };
    }
  });
