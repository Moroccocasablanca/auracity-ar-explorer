import { useEffect, useState } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export function FriendsPanel({ userId }: { userId: string }) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [invitation, setInvitation] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [friends, setFriends] = useState<{ friend_id: string; display_name: string }[]>([]);
  const load = async () => {
    const { data, error } = await supabase.rpc("accepted_friends");
    if (error) { toast.error(t("err.unavailable")); return; }
    setFriends(data ?? []);
  };
  useEffect(() => { void load(); }, [userId]);
  return <section className="space-y-3 border-t border-border pt-4">
    <h2 className="flex items-center gap-2 font-semibold"><UserPlus className="size-4" />{t("friends.title")}</h2>
    <div className="flex gap-2">
      <input aria-label={t("friends.name")} placeholder={t("friends.name")} maxLength={30} value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 rounded-md border border-input bg-card px-2 py-2 text-sm" />
      <Button variant="outline" size="icon" title={t("friends.save")} aria-label={t("friends.save")} disabled={busy || !name.trim()} onClick={async () => {
        setBusy(true);
        const { error } = await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", userId);
        setBusy(false);
        if (error) toast.error(t("err.unavailable")); else toast.success(t("form.sent"));
      }}><Check /></Button>
    </div>
    <Button variant="outline" disabled={busy} onClick={async () => {
      setBusy(true);
      const { data, error } = await supabase.from("friend_invites").insert({ sender_id: userId }).select("id").single();
      setBusy(false);
      if (error) { toast.error(t("err.unavailable")); return; }
      setInvitation(data.id);
    }}><UserPlus />{t("friends.invite")}</Button>
    {invitation && <div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs text-primary">{invitation}</code><Button variant="ghost" size="icon" title={t("friends.copy")} aria-label={t("friends.copy")} onClick={async () => { try { await navigator.clipboard.writeText(invitation); toast.success(t("friends.copied")); } catch { toast.error(t("err.unavailable")); } }}><Copy /></Button></div>}
    <input aria-label={t("friends.code")} placeholder={t("friends.code")} value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-md border border-input bg-card px-2 py-2 text-sm" />
    <Button disabled={busy || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code.trim())} onClick={async () => {
      setBusy(true);
      const { data, error } = await supabase.rpc("accept_friend_invite", { invite_code: code.trim() });
      setBusy(false);
      if (error || !data) { toast.error(t("friends.invalid")); return; }
      setCode(""); void load(); toast.success(t("friends.accepted"));
    }}><Check />{t("friends.accept")}</Button>
    <ul className="space-y-2 text-sm">{friends.map((friend) => <li key={friend.friend_id}>{friend.display_name || t("privacy.visitor")}</li>)}</ul>
  </section>;
}