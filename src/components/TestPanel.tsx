// Test tools for the owner: only on localhost / Lovable preview hosts (never in the published app).
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FlaskConical, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/lib/location";
import { nodesQuery } from "@/lib/nodes";
import { isRestaurant } from "@/lib/explore-rules";
import { isGardenObject } from "@/lib/node-rules";
import { markDiscovered } from "@/lib/discovered";
import { logEvent } from "@/lib/quest";
import { SERVICES, SERVICE_META } from "@/lib/services";
import { canUseTestAdmin } from "@/lib/systemConfig";
import { useI18n } from "@/lib/i18n";
import { startPreviewAdmin } from "@/lib/account.functions";
import { getInviteOverride, setInviteOverride } from "@/lib/invites";
import { useProximityAlerts } from "@/components/ProximityWatcher";
import { readVoiceLog } from "@/lib/voice-log";

export function TestPanel() {
  const { t } = useI18n();
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [invId, setInvId] = useState("");
  const [vlogText, setVlogText] = useState("");
  const [invText, setInvText] = useState("");
  const alerts = useProximityAlerts();
  const loc = useLocation();
  const navigate = useNavigate();
  const { data: nodes = [] } = useQuery(nodesQuery);
  useEffect(() => setAllowed(canUseTestAdmin(window.location.hostname, import.meta.env.DEV)), []);
  if (!allowed) return null;

  const restaurants = nodes.filter(isRestaurant);
  const venue = nodes.find((n) => n.id === invId) ?? nodes.find((n) => n.slug === "bucheria") ?? restaurants[0];
  const pickVenue = (id: string) => {
    setInvId(id);
    setInvText(getInviteOverride(id));
  };
  const sendNow = async () => {
    if (!venue) return;
    setInviteOverride(venue.id, invText);
    await alerts.enable();
    window.dispatchEvent(new CustomEvent("aura-test-invite", { detail: { nodeId: venue.id } }));
    setMsg(t("test.inv.sent"));
    setOpen(false);
  };
  const walkNear = async () => {
    if (!venue) return;
    setInviteOverride(venue.id, invText);
    await alerts.enable();
    localStorage.removeItem("aura_notified");
    window.dispatchEvent(new Event("aura-prox-reset"));
    loc.simulate({ lat: venue.lat + 0.00008, lng: venue.lng + 0.00008 });
    setMsg(t("test.inv.walked"));
    setOpen(false);
  };
  const monuments = nodes.filter((n) => n.kind === "monument");
  const gardens = nodes.filter(isGardenObject);
  const go = (lat: number, lng: number, label: string) => {
    loc.simulate({ lat, lng });
    setMsg(t("test.moved", { name: label }));
  };
  const admin = async () => {
    setMsg("…");
    try {
      const r = await startPreviewAdmin();
      if (!r.enabled) return setMsg(t("test.admin.off"));
      const { error } = await supabase.auth.verifyOtp({ token_hash: r.tokenHash, type: "magiclink" });
      setMsg(error ? t("test.admin.err") : t("test.admin.ok"));
    } catch {
      setMsg(t("test.admin.err"));
    }
  };
  const unlock = () => {
    gardens.forEach((g) => markDiscovered(g.id));
    restaurants.slice(0, 6).forEach((r) => logEvent("stamp", r.id));
    monuments.slice(0, 3).forEach((m) => logEvent("monument", m.id));
    setMsg(t("test.unlocked"));
  };
  const demoOn = typeof localStorage !== "undefined" && localStorage.getItem("aura_demo_msgs") === "1";
  const toggleDemo = () => {
    localStorage.setItem("aura_demo_msgs", demoOn ? "0" : "1");
    setMsg(demoOn ? t("test.demo.off") : t("test.demo.on"));
    setOpen(false);
    setTimeout(() => window.location.reload(), 100);
  };
  const sel = "w-full rounded-xl border border-input bg-secondary/70 px-3 py-2.5 text-sm";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("test.admin")}
        className="fixed left-3 top-14 z-[60] flex size-9 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-300/95 text-black shadow-lg"
      >
        <FlaskConical className="size-4" />
        <span className="sr-only">{t("test.admin")}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-3 sm:items-center" onClick={() => setOpen(false)}>
          <div className="max-h-[85dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-3xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{t("test.title")}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"><X className="size-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground">{t("test.sub")}</p>

            <button type="button" onClick={admin} className="w-full rounded-full bg-amber-300 px-4 py-3 text-sm font-extrabold text-black">{t("test.admin.enter")}</button>

            <label className="block text-xs font-semibold">{t("test.goto.rest")}
              <select className={`${sel} mt-1`} defaultValue="" onChange={(e) => { const n = restaurants.find((r) => r.id === e.target.value); if (n) { go(n.lat, n.lng, n.name); navigate({ to: "/node/$slug", params: { slug: n.slug } }); setOpen(false); } }}>
                <option value="" disabled>—</option>
                {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold">{t("test.goto.place")}
              <select className={`${sel} mt-1`} defaultValue="" onChange={(e) => {
                const [kind, id] = e.target.value.split(":");
                const n = kind === "n" ? [...monuments, ...gardens].find((x) => x.id === id) : null;
                const s = kind === "s" ? SERVICES.find((x) => x.id === id) : null;
                if (n) go(n.lat, n.lng, n.name);
                if (s) go(s.lat, s.lng, s.name ?? t(SERVICE_META[s.type].label));
              }}>
                <option value="" disabled>—</option>
                <optgroup label={t("kind.monument")}>{monuments.map((n) => <option key={n.id} value={`n:${n.id}`}>{n.name}</option>)}</optgroup>
                <optgroup label={t("explore.gardens")}>{gardens.map((n) => <option key={n.id} value={`n:${n.id}`}>{n.name}</option>)}</optgroup>
                <optgroup label={t("explore.services")}>{SERVICES.filter((s) => s.type !== "aed").map((s) => <option key={s.id} value={`s:${s.id}`}>{s.name ?? t(SERVICE_META[s.type].label)}</option>)}</optgroup>
              </select>
            </label>
            <button type="button" onClick={unlock} className="w-full rounded-full border border-border px-4 py-3 text-sm font-bold">{t("test.unlock")}</button>
            <div className="space-y-2 rounded-2xl border border-amber-300/50 p-3">
              <p className="text-sm font-bold">{t("test.inv.title")}</p>
              <label className="block text-xs font-semibold">{t("test.inv.venue")}
                <select className={`${sel} mt-1`} value={venue?.id ?? ""} onChange={(e) => pickVenue(e.target.value)}>
                  {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold">{t("test.inv.text")}
                <textarea className={`${sel} mt-1 min-h-20`} value={invText} onChange={(e) => setInvText(e.target.value)} />
              </label>
              <button type="button" onClick={sendNow} className="w-full rounded-full bg-amber-300 px-4 py-2.5 text-sm font-extrabold text-black">{t("test.inv.now")}</button>
              <button type="button" onClick={walkNear} className="w-full rounded-full border border-amber-300 px-4 py-2.5 text-sm font-bold">{t("test.inv.walk")}</button>
            </div>
            <div className="space-y-2 rounded-2xl border border-border p-3">
              <button type="button" onClick={() => setVlogText(readVoiceLog() || "—")} className="w-full rounded-full border border-border px-4 py-2.5 text-sm font-bold">{t("test.vlog")}</button>
              {vlogText && <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-black/40 p-2 text-[0.65rem] leading-snug">{vlogText}</pre>}
            </div>
            <button type="button" onClick={toggleDemo} className="w-full rounded-full border border-border px-4 py-3 text-sm font-bold">{demoOn ? t("test.demo.disable") : t("test.demo.enable")}</button>
            {msg && <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm">{msg}</p>}
          </div>
        </div>
      )}
    </>
  );
}
