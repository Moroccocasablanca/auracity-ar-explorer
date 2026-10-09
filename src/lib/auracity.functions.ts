import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { distanceM, isOpenNow, romeDate, type Hours } from "./geo";

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

export type ActionResult = { ok: true } | { ok: false; error: ActionError; distance?: number };

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
      .select("id, kind, lat, lng, radius_m")
      .eq("id", data.nodeId)
      .maybeSingle();
    if (!node) return { ok: false, error: "not_found" };
    // Bench messages are reserved to registered users (postBenchMessage).
    if (node.kind === "bench") return { ok: false, error: "login_required" };

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
