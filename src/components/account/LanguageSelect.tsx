import { Link } from "@tanstack/react-router";
import { AvatarPicker } from "@/components/account/AvatarPicker";
import { useQuery } from "@tanstack/react-query";
import { nodesQuery } from "@/lib/nodes";
import { useFollowing } from "@/services/notifications/follow";
import { setPrefs, usePrefs } from "@/services/notifications/notify-prefs";
import { Globe, Store } from "lucide-react";
import { LANG_NAMES, LANGS, useI18n, type Lang } from "@/lib/i18n";

/** Language and "for venues" shortcuts live in the Account page, so the bottom bar stays light. */
export function LanguageSelect() {
  const { t, lang, setLang } = useI18n();
  const { ids, store, toggle, setOpt } = useFollowing();
  const { data: nodes = [] } = useQuery(nodesQuery);
  const followed = nodes.filter((n) => ids.includes(n.id));
  const prefs = usePrefs();
  return (
    <>
    <AvatarPicker />
    <div className="space-y-2 rounded-2xl border border-border bg-card/60 p-4">
      <label className="flex items-center gap-3 text-sm font-semibold">
        <Globe className="size-5 text-primary" />
        <span className="flex-1">{t("lang.label")}</span>
        <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="rounded-xl border border-input bg-secondary/70 px-3 py-2 text-sm">
          {LANGS.map((l) => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}
        </select>
      </label>
      <div className="space-y-2 border-t border-border pt-2">
        <p className="text-sm font-semibold">{t("notif.title")}</p>
        <p className="text-xs text-muted-foreground">{t("notif.help")}</p>
        <label className="flex items-center justify-between gap-3 text-sm"><span>{t("notif.max")}</span>
          <select value={prefs.maxPerDay} onChange={(e) => setPrefs({ maxPerDay: Number(e.target.value) })} className="rounded-xl border border-input bg-secondary/70 px-2 py-1.5 text-sm">{[1, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </label>
        {followed.length === 0 && <p className="text-xs text-muted-foreground">{t("follow.none")}</p>}
        {followed.map((n) => (
          <div key={n.id} className="space-y-1 rounded-xl border border-border p-2.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <Link to="/node/$slug" params={{ slug: n.slug }} className="min-w-0 flex-1 font-semibold">{n.name}</Link>
              <button type="button" onClick={() => void toggle(n.id)} className="rounded-full border border-border px-3 py-1 text-xs">{t("follow.stop")}</button>
            </div>
            <label className="flex items-center justify-between gap-3 text-xs"><span>{t("follow.nearby")}</span><input type="checkbox" checked={store[n.id]?.nearby ?? false} onChange={(e) => setOpt(n.id, "nearby", e.target.checked)} className="size-5" /></label>
            <label className="flex items-center justify-between gap-3 text-xs"><span>{t("follow.remote")}</span><input type="checkbox" checked={store[n.id]?.remote ?? false} onChange={(e) => setOpt(n.id, "remote", e.target.checked)} className="size-5" /></label>
          </div>
        ))}
      </div>
      <Link to="/business" className="flex items-center gap-3 text-sm font-semibold">
        <Store className="size-5 text-primary" />
        <span className="flex-1">{t("nav.business")}</span>
        <span aria-hidden="true">›</span>
      </Link>
    </div>
    </>
  );
}
