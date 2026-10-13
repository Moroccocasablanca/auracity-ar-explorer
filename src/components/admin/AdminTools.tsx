// Owner / admin box on the Account page (test hosts only): enter as admin without signing up, then manage what every venue says
// when you walk past it (today's menu, offer) and receive that notification live on this phone.
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, ShieldCheck, X } from "lucide-react";
import { photoToAvatar } from "@/lib/avatar";
import { dishImage } from "@/lib/dishes";
import { supabase } from "@/integrations/supabase/client";
import { startPreviewAdmin } from "@/lib/account.functions";
import { getInviteOverride, setInviteOverride } from "@/services/notifications/invites";
import { classesToText, EXAMPLE, getVenueContent, GYM_EXAMPLE, menuToText, parseClasses, parseMenu, setVenueContent } from "@/lib/venue-content";
import { ACTIVITIES, ACTIVITY_META } from "@/lib/activities";
import { launchPromo, stopPromo, useDashboard, useFlash } from "@/lib/merchant";
import { speakAny } from "@/services/voice/speech";
import { VoicePersona } from "@/services/voice/voice-persona";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { nodesQuery } from "@/lib/nodes";
import { canUseTestAdmin } from "@/config/systemConfig";
import { useProximityAlerts } from "@/components/ProximityWatcher";
import { useFollowing } from "@/services/notifications/follow";

const FLAG = "aura_admin";
const field = "w-full rounded-xl border border-input bg-secondary/70 px-3 py-2.5 text-sm";

export function AdminTools() {
  const { t } = useI18n();
  const [allowed, setAllowed] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [venueId, setVenueId] = useState("");
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("");
  const [offer, setOffer] = useState("");
  const [specials, setSpecials] = useState("");
  const [menuText, setMenuText] = useState("");
  const [reviews, setReviews] = useState(false);
  const [classesText, setClassesText] = useState("");
  const [voice, setVoice] = useState<"female" | "male">("female");
  const [menu3d, setMenu3d] = useState(false);
  const [photos, setPhotos] = useState<Record<string, string>>({}); // the owner's own dish photos, by dish name
  const [flashText, setFlashText] = useState("");
  const [flashMin, setFlashMin] = useState(30);
  const flash = useFlash(venueId || "bucheria-default");
  const stats = useDashboard(venueId || "bucheria-default");
  const { data: nodes = [] } = useQuery(nodesQuery);
  const loc = useLocation();
  const alerts = useProximityAlerts();
  const fol = useFollowing();
  const navigate = useNavigate();

  useEffect(() => {
    setAllowed(canUseTestAdmin(window.location.hostname, import.meta.env.DEV));
    setAdmin(localStorage.getItem(FLAG) === "1");
  }, []);
  const load = (id: string) => {
    const c = getVenueContent(id);
    setText(getInviteOverride(id));
    setOffer(c.offer ?? "");
    setSpecials(c.specials ?? "");
    setMenuText(menuToText(c.menu));
    setPhotos(Object.fromEntries((c.menu ?? []).filter((m) => m.img).map((m) => [m.name, m.img as string])));
    setReviews(Boolean(c.reviews?.length));
    setClassesText(classesToText(c.classes));
    setVoice(c.voice ?? "female");
    setMenu3d(Boolean(c.has3DMenu));
  };
  useEffect(() => {
    if (!admin) return;
    const v = nodes.find((n) => n.id === venueId) ?? ACTIVITIES.find((a) => a.id === venueId) ?? nodes.find((n) => n.slug === "bucheria") ?? nodes.find((n) => n.kind === "business");
    if (v) load(v.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, venueId, nodes.length]);
  if (!allowed) return null;

  // Everything the admin can manage: venues of the app and gyms / sports places.
  const venues = [
    ...nodes.filter((n) => n.kind === "business").map((n) => ({ id: n.id, name: n.name, slug: n.slug, lat: n.lat, lng: n.lng, activity: false })),
    ...ACTIVITIES.filter((a) => a.type !== "playground").map((a) => ({ id: a.id, name: `${a.name ?? "?"} · ${t(ACTIVITY_META[a.type].label)}`, slug: a.id, lat: a.lat, lng: a.lng, activity: true })),
  ].sort((a, b) => a.name.localeCompare(b.name));
  const shown = filter.trim() ? venues.filter((v) => v.name.toLowerCase().includes(filter.trim().toLowerCase())) : venues;
  const venue = venues.find((v) => v.id === venueId) ?? venues.find((v) => v.slug === "bucheria") ?? venues[0];

  const enter = async () => {
    try {
      const r = await startPreviewAdmin();
      if (r.enabled) await supabase.auth.verifyOtp({ token_hash: r.tokenHash, type: "magiclink" });
    } catch {
      /* the server admin is optional: the local admin below always works */
    }
    localStorage.setItem(FLAG, "1");
    setAdmin(true);
    toast.success(t("test.admin.ok"));
  };
  const leave = () => {
    localStorage.removeItem(FLAG);
    setAdmin(false);
  };
  const pick = (id: string) => {
    setVenueId(id);
    load(id);
  };
  const saveContent = () => {
    if (!venue) return;
    setVenueContent(venue.id, { offer: offer.trim() || undefined, specials: specials.trim() || undefined, menu: parseMenu(menuText).map((m) => (photos[m.name] ? { ...m, img: photos[m.name] } : m)), reviews: reviews ? EXAMPLE.reviews : undefined, classes: parseClasses(classesText), voice, has3DMenu: menu3d });
    toast.success(t("admin.content.saved"));
  };
  const gymExample = () => {
    setOffer(GYM_EXAMPLE.offer ?? "");
    setClassesText(classesToText(GYM_EXAMPLE.classes));
    setSpecials("");
    setMenuText("");
    setReviews(false);
  };
  const example = () => {
    setOffer(EXAMPLE.offer ?? "");
    setSpecials(EXAMPLE.specials ?? "");
    setMenuText(menuToText(EXAMPLE.menu));
    setReviews(true);
  };

  const save = () => {
    if (!venue) return;
    setInviteOverride(venue.id, text);
    toast.success(t("admin.saved"));
  };
  const send = async () => {
    if (!venue) return;
    setInviteOverride(venue.id, text);
    await alerts.enable();
    window.dispatchEvent(new CustomEvent("aura-test-invite", { detail: { nodeId: venue.id } }));
  };
  const launch = async () => {
    if (!venue || !flashText.trim()) return;
    const p = launchPromo(venue.id, venue.name.split(" · ")[0]!, flashText, flashMin);
    await alerts.enable();
    // The announcement is spoken right away with the venue's chosen voice, then sent to followers who accepted far-away messages.
    void speakAny(p.aiGeneratedAudioResponse, "it", undefined, VoicePersona.BUSINESS_USER, voice);
    toast.success(t("admin.flash.live", { m: flashMin }));
    if (fol.store[venue.id]?.remote) window.dispatchEvent(new CustomEvent("aura-test-invite", { detail: { nodeId: venue.id, text: p.rawTextFromOwner } }));
  };
  const sendFollowers = async () => {
    if (!venue) return;
    setInviteOverride(venue.id, text);
    if (!fol.store[venue.id]?.remote) return void toast.message(t("admin.followers.none"));
    await alerts.enable();
    window.dispatchEvent(new CustomEvent("aura-test-invite", { detail: { nodeId: venue.id } }));
    toast.success(t("admin.followers.sent"));
  };
  const walk = async () => {
    if (!venue) return;
    setInviteOverride(venue.id, text);
    await alerts.enable();
    // Test: the venue must be followed to notify, so follow it and clear today's counter.
    if (!fol.ids.includes(venue.id)) await fol.toggle(venue.id);
    localStorage.removeItem("aura_notified");
    window.dispatchEvent(new Event("aura-prox-reset"));
    loc.simulate({ lat: venue.lat + 0.00008, lng: venue.lng + 0.00008 });
    toast.success(t("test.inv.walked"));
  };

  if (!admin) {
    return (
      <div className="rounded-2xl border-2 border-amber-300/70 bg-amber-300/10 p-4">
        <p className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="size-4" /> {t("admin.title")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("admin.sub")}</p>
        <button type="button" onClick={enter} className="mt-3 w-full rounded-full bg-amber-300 px-4 py-3 text-sm font-extrabold text-black">{t("admin.enter")}</button>
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-2xl border-2 border-amber-300/70 bg-amber-300/10 p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="size-4" /> {t("admin.on")}</p>
        <button type="button" onClick={leave} className="text-xs underline">{t("admin.leave")}</button>
      </div>
      <p className="text-xs text-muted-foreground">{t("admin.help")}</p>
      <input className={field} placeholder={t("admin.search")} value={filter} onChange={(e) => setFilter(e.target.value)} />
      <select className={field} value={venue?.id ?? ""} onChange={(e) => pick(e.target.value)}>
        {shown.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      <textarea className={`${field} min-h-24`} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("admin.menu.ph")} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={send} className="rounded-full bg-amber-300 px-3 py-2.5 text-sm font-extrabold text-black">{t("admin.send")}</button>
        <button type="button" onClick={walk} className="rounded-full border border-amber-300 px-3 py-2.5 text-sm font-bold">{t("admin.walk")}</button>
        <button type="button" onClick={sendFollowers} className="col-span-2 rounded-full border-2 border-amber-300 px-3 py-2.5 text-sm font-extrabold">{t("admin.followers")}</button>
        <button type="button" onClick={save} className="rounded-full border border-border px-3 py-2.5 text-sm font-bold">{t("admin.save")}</button>
        <button type="button" onClick={() => venue && (venue.activity ? navigate({ to: "/attivita/$id", params: { id: venue.id } }) : navigate({ to: "/node/$slug", params: { slug: venue.slug } }))} className="rounded-full border border-border px-3 py-2.5 text-sm font-bold">{t("admin.open")}</button>
      </div>
      <div className="space-y-2 rounded-xl border-2 border-amber-300/60 p-3">
        <p className="text-sm font-bold">{t("admin.flash")}</p>
        <input className={field} value={flashText} onChange={(e) => setFlashText(e.target.value)} placeholder={t("admin.flash.ph")} />
        <div className="grid grid-cols-2 gap-2">
          <select className={field} value={flashMin} onChange={(e) => setFlashMin(Number(e.target.value))}>{[15, 30, 45, 60, 120].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
          <button type="button" onClick={launch} className="rounded-full bg-amber-300 px-3 py-2.5 text-sm font-extrabold text-black">{t("admin.flash.go")}</button>
        </div>
        {flash && <p className="text-xs text-green-300">{t("admin.flash.on", { t: flash.rawTextFromOwner, m: flash.minutesLeft })} <button type="button" className="underline" onClick={() => venue && stopPromo(venue.id)}>{t("admin.flash.stop")}</button></p>}
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-xl border border-border p-3 text-center">
        <div><p className="text-xl font-bold">{stats.totalArViews}</p><p className="text-[0.65rem] text-muted-foreground">{t("dash.ar")}</p></div>
        <div><p className="text-xl font-bold">{stats.voiceReviewsListened}</p><p className="text-[0.65rem] text-muted-foreground">{t("dash.reviews")}</p></div>
        <div><p className="text-xl font-bold">{stats.promosRedeemed}</p><p className="text-[0.65rem] text-muted-foreground">{t("dash.promos")}</p></div>
      </div>
      <div className="space-y-2 rounded-xl border border-border p-3">
        <p className="text-sm font-bold">{t("admin.content")}</p>
        <input className={field} value={offer} onChange={(e) => setOffer(e.target.value)} placeholder={t("admin.offer.ph")} />
        <input className={field} value={specials} onChange={(e) => setSpecials(e.target.value)} placeholder={t("admin.specials.ph")} />
        <textarea className={`${field} min-h-24`} value={menuText} onChange={(e) => setMenuText(e.target.value)} placeholder={t("admin.items.ph")} />
        {parseMenu(menuText).length > 0 && (
          <ul className="space-y-1.5">
            {parseMenu(menuText).map((m) => (
              <li key={m.name} className="flex items-center gap-2 rounded-xl border border-border p-1.5 text-xs">
                <img src={dishImage({ name: m.name, img: photos[m.name] })} alt="" className="size-10 shrink-0 rounded-lg bg-white/90 object-contain" />
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
                <label className="flex cursor-pointer items-center gap-1 rounded-full bg-primary/20 px-2.5 py-1.5 font-semibold">
                  <ImagePlus className="size-3.5" /> {t("admin.dish.photo")}
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { try { const data = await photoToAvatar(f, 220); setPhotos((p) => ({ ...p, [m.name]: data })); } catch { toast.error(t("avatar.err")); } } }} />
                </label>
                {photos[m.name] && <button type="button" aria-label="remove" onClick={() => setPhotos((p) => { const n = { ...p }; delete n[m.name]; return n; })}><X className="size-4" /></button>}
              </li>
            ))}
          </ul>
        )}
        <textarea className={`${field} min-h-24`} value={classesText} onChange={(e) => setClassesText(e.target.value)} placeholder={t("admin.classes.ph")} />
        <label className="flex items-center justify-between gap-3 text-xs"><span>{t("admin.voice")}</span>
          <select value={voice} onChange={(e) => setVoice(e.target.value as "female" | "male")} className={`${field} w-auto py-1.5`}><option value="female">{t("audio.female")}</option><option value="male">{t("audio.male")}</option></select>
        </label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={menu3d} onChange={(e) => setMenu3d(e.target.checked)} /> {t("admin.menu3d")}</label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={reviews} onChange={(e) => setReviews(e.target.checked)} /> {t("admin.reviews.demo")}</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={example} className="rounded-full border border-amber-300 px-3 py-2.5 text-sm font-bold">{t("admin.example")}</button>
          <button type="button" onClick={gymExample} className="rounded-full border border-amber-300 px-3 py-2.5 text-sm font-bold">{t("admin.example.gym")}</button>
          <button type="button" onClick={saveContent} className="rounded-full bg-amber-300 px-3 py-2.5 text-sm font-extrabold text-black">{t("admin.content.save")}</button>
        </div>
      </div>
    </div>
  );
}
