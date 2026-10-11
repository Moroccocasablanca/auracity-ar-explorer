import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canUseTestAdmin } from "./systemConfig";

const TEST_ADMIN_EMAIL = "auracity.preview.admin@lovable.test";

async function previewAllowed() {
  const { getRequestHost } = await import("@tanstack/react-start/server");
  return canUseTestAdmin(getRequestHost(), process.env['NODE_ENV'] !== "production");
}

export const startPreviewAdmin = createServerFn({ method: "POST" }).handler(async () => {
  if (!(await previewAllowed())) return { enabled: false as const };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let user = users.users.find((candidate) => candidate.email === TEST_ADMIN_EMAIL);
  if (!user) {
    const created = await supabaseAdmin.auth.admin.createUser({ email: TEST_ADMIN_EMAIL, email_confirm: true, user_metadata: { display_name: "TEST ADMIN", account_type: "user" } });
    if (created.error || !created.data.user) throw new Error("Unable to create preview administrator");
    user = created.data.user;
  }
  await supabaseAdmin.from("user_roles").upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
  const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: TEST_ADMIN_EMAIL });
  const tokenHash = link.data.properties?.hashed_token;
  if (link.error || !tokenHash) throw new Error("Unable to create preview administrator session");
  return { enabled: true as const, tokenHash };
});

export const previewAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await previewAllowed())) return { active: false };
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { active: data === true };
  });

export const downloadMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, messages, invites, roles] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      context.supabase.from("messages").select("id,node_id,body,created_at").eq("user_id", context.userId),
      context.supabase.from("friend_invites").select("id,sender_id,receiver_id,accepted_at,created_at").or(`sender_id.eq.${context.userId},receiver_id.eq.${context.userId}`),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    return { exportedAt: new Date().toISOString(), profile: profile.data, messages: messages.data ?? [], friendInvites: invites.data ?? [], roles: roles.data ?? [], preciseLocationHistory: [] };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("messages").delete().eq("user_id", context.userId);
    await supabaseAdmin.from("friend_invites").delete().or(`sender_id.eq.${context.userId},receiver_id.eq.${context.userId}`);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw error;
    return { deleted: true };
  });