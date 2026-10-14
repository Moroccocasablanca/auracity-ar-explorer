import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronRight, Crosshair, Dumbbell, Info, Landmark, LayoutGrid, Moon, ShieldPlus, Store, Sun, SunMoon, TreePine, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMapAppearance } from "@/components/map/MapAppearanceControl";
import type { MapMode } from "@/lib/map-appearance";
import { useProximityAlerts } from "@/components/ProximityWatcher";
import { distanceM, formatDistance } from "@/utils/geo";
import { kindKey, useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { useAvatar, useRing } from "@/lib/avatar";
import { getNick } from "@/lib/leaderboard";
import { placeStyle, PLACE_STYLE } from "@/lib/place-style";
import { speakAny } from "@/services/voice/speech";
import { VoicePersona } from "@/services/voice/voice-persona";
import { contentLang, detectTextLang, greetingWithName, nameLanguage, nameThenText } from "@/services/voice/text-speech";
import { history, description, nodeMenu, promo, messagesQuery, nodesQuery, tagline, type NodeRow } from "@/lib/nodes";
import { explorePriority, matchesExploreFilter, type ExploreFilter } from "@/lib/explore-rules";
import { useNarrator } from "@/components/ListenButton";
import { isGardenObject } from "@/lib/node-rules";
import { discovered, markDiscovered } from "@/lib/discovered";
import { directionsUrl, isEssential, SERVICES, SERVICE_META, telHref, type ServicePlace } from "@/lib/services";
import { ACTIVITIES, ACTIVITY_META } from "@/lib/activities";
import type { Poi } from "@/lib/poi";
import { logEvent } from "@/lib/quest";

const BraMap = lazy(() => import("@/components/map/BraMap"));

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore Bra — AURACITY nodes" },
      {
        name: "description",
        content: "Discover restaurants, historic monuments and animated talking gardens in Bra with AURACITY.",
      },
      { property: "og:title", content: "Explore Bra — AURACITY nodes" },
      {
        property: "og:description",
        content: "Discover restaurants, historic monuments and animated talking gardens in Bra with AURACITY.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Explore,
});

function Explore() {
  const { t, lang } = useI18n();
  const loc = useLocation();
  const myAvatar = useAvatar();
  const myRing = useRing();
  const [myName, setMyName] = useState("");
  useEffect(() => { setMyName(getNick()); const f = () => setMyName(getNick()); window.addEventListener("focus", f); return () => window.removeEventListener("focus", f); }, []);
  const { pos } = loc;
  const { mode, appearance, selectMode } = useMapAppearance();
  const [recenter, setRecenter] = useState(0);
  // The map shows "You are here" as soon as it opens: ask for the position right away instead of waiting for the locate button.
  const askedOnce = useRef(false);
  useEffect(() => {
    if (askedOnce.current || loc.active) return;
    askedOnce.current = true;
    void loc.start().then(() => setRecenter((v) => v + 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { data: nodes = [] } = useQuery(nodesQuery);
  const [kind, setKind] = useState<ExploreFilter>("all");

  const list = useMemo(() => {
    return nodes
      .filter((n) => matchesExploreFilter(n, kind))
      .map((n) => ({ n, d: pos ? distanceM(pos, n) : null }))
      .sort((a, b) => explorePriority(a.n) - explorePriority(b.n) || (a.d != null && b.d != null ? a.d - b.d : a.n.name.localeCompare(b.n.name)));
  }, [nodes, kind, pos]);
  const filtered = useMemo(() => list.map((x) => x.n), [list]);
  // Services: essentials are always on the map; defibrillators only in the Services filter.
  const mapServices = useMemo(() => (kind === "services" ? SERVICES : kind === "all" ? SERVICES.filter(isEssential) : []), [kind]);
  // Activities: gyms, sports centres, playgrounds... (all in "Sport & leisure", playgrounds also under the kids' gardens)
  const mapActivities = useMemo(
    () => (kind === "activities" ? ACTIVITIES : kind === "gardens" ? ACTIVITIES.filter((a) => a.type === "playground") : kind === "all" ? ACTIVITIES.filter((a) => a.type === "gym" || a.type === "pool") : []),
    [kind],
  );
  const pois = useMemo<Poi[]>(
    () => [
      ...mapServices.map((s) => {
        const m = SERVICE_META[s.type];
        return { id: s.id, lat: s.lat, lng: s.lng, title: s.name ?? null, tag: t(m.label), color: m.color, bg: m.bg, fg: m.fg, symbol: m.symbol, icon: m.icon, minZoom: kind === "services" ? 14 : 14.5, phone: s.phone, address: s.address, hours: s.hours };
      }),
      ...mapActivities.map((a) => {
        const m = ACTIVITY_META[a.type];
        return { id: a.id, lat: a.lat, lng: a.lng, title: a.name ?? t(m.label), tag: t(m.label), color: m.color, bg: m.color, fg: "#ffffff", symbol: m.symbol, icon: m.icon, minZoom: kind === "activities" ? 14 : m.minZoom, phone: a.phone, address: a.address, hours: a.hours, open: `/attivita/${a.id}` };
      }),
    ],
    [mapServices, mapActivities, kind, t],
  );
  const serviceLabel = useCallback((s: ServicePlace) => (s.name ? s.name : t(SERVICE_META[s.type].label)), [t]);
  const serviceList = useMemo(
    () => SERVICES.map((s) => ({ s, d: pos ? distanceM(pos, s) : null })).sort((a, b) => (a.d ?? 0) - (b.d ?? 0) || a.s.type.localeCompare(b.s.type)).slice(0, 14),
    [pos],
  );
  const kindLabel = useCallback((k: string) => t(kindKey(k)), [t]);
  const alerts = useProximityAlerts();
  const qc = useQueryClient();
  const { playing, play, stop } = useNarrator();
  const gardens = useMemo(() => nodes.filter(isGardenObject), [nodes]);
  const [found, setFound] = useState(0);
  useEffect(() => setFound(discovered().filter((id) => gardens.some((g) => g.id === id)).length), [gardens, playing]);
  const onTalk = useCallback(
    async (n: NodeRow) => {
      if (playing === n.id) { stop(); return; }
      if (n.kind === "business") {
        const items = nodeMenu(n).slice(0, 6).map((m) => m.name).join(", ");
        const body = [promo(n, lang), items && `${t("node.menu")}: ${items}`].filter(Boolean).join(". ");
        void speakAny(nameThenText(n.name, body, contentLang(lang), nameLanguage(n.name, n.kind)), contentLang(lang), undefined, VoicePersona.BUSINESS_USER);
        return;
      }
      if (n.kind === "monument") {
        logEvent("monument", n.id);
        // Monuments tell their COMPLETE story, start to finish.
        play(n.id, { nodeId: n.id, source: "history", lang: contentLang(lang), persona: VoicePersona.MONUMENT_FEMALE, full: true }, nameThenText(n.name, history(n, lang) || description(n, lang), contentLang(lang)));
        return;
      }
      const msgs = await qc.fetchQuery(messagesQuery(n.id));
      const m = msgs[0];
      markDiscovered(n.id);
      if (!m) {
        void speakAny(greetingWithName(t("garden.hello", { name: "§" }), n.name, lang, t("garden.empty")), lang, undefined, VoicePersona.HUNT_DYNAMIC);
        return;
      }
      play(n.id, { nodeId: n.id, source: "message", messageId: m.id, persona: VoicePersona.HUNT_DYNAMIC, lang: detectTextLang(m.body, lang) }, m.body);
    },
    [qc, play, playing, stop, lang],
  );
  const talkLabel = t("garden.talk");

  const [legend, setLegend] = useState(false);
  const modes: MapMode[] = ["auto", "day", "night"];
  const nextMode = modes[(modes.indexOf(mode) + 1) % 3]!;
  const ModeIcon = mode === "auto" ? SunMoon : mode === "day" ? Sun : Moon;
  const chips = ["all", "restaurants", "monument", "gardens", "business", "activities", "services"] as const;
  const chipIcon = { all: LayoutGrid, restaurants: Utensils, monument: Landmark, gardens: TreePine, business: Store, activities: Dumbbell, services: ShieldPlus } as const;
  const chipLabel = (k: (typeof chips)[number]) => (k === "all" ? t("all") : k === "restaurants" ? t("explore.restaurants") : k === "gardens" ? t("explore.gardens") : k === "services" ? t("explore.services") : k === "activities" ? t("explore.activities") : t(kindKey(k)));

  return (
    <div className="min-h-screen pb-28">
      {/* The map is the first thing you see: as tall as the screen, with its controls floating on top. */}
      <div className="flex h-[calc(100dvh-5.4rem)] min-h-[26rem] w-full flex-col bg-card/60">
        <div className="relative z-[5] shrink-0 border-b border-border bg-card/95 px-3 pb-2 pt-[max(0.55rem,env(safe-area-inset-top))] backdrop-blur">
          <div className="chip-row -mx-3 flex gap-2 overflow-x-scroll px-3 pb-1" style={{ touchAction: "pan-x", overscrollBehaviorX: "contain" }}>
            {chips.map((k) => {
              const Icon = chipIcon[k];
              const on = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  aria-pressed={on}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[0.8rem] font-semibold shadow-lg backdrop-blur-md transition active:scale-95 ${on ? "border-transparent bg-gradient-to-r from-cyan-300 to-sky-400 text-slate-900" : "border-white/15 bg-card/80 text-foreground"}`}
                >
                  <Icon className="size-4" />
                  {chipLabel(k)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden">
        <ClientOnly fallback={<div className="h-full w-full animate-pulse bg-card/60" />}>
          <Suspense fallback={<div className="h-full w-full animate-pulse bg-card/60" />}>
            <BraMap nodes={filtered} pos={pos} kindLabel={kindLabel} placeLabel={(n) => t(placeStyle(n).label)} appearance={appearance} recenter={recenter} onTalk={onTalk} talkLabel={talkLabel} pois={pois} poiText={{ call: t("svc.call"), directions: t("svc.directions"), open: t("act.open") }} readLabel={t("venue.read")} openLabel={(o) => t(o ? "node.open" : "node.closed")} speakingId={playing} me={{ label: t("map.me"), accuracy: loc.accuracy, heading: loc.heading, avatar: myAvatar, name: myName, ring: myRing }} />
          </Suspense>
        </ClientOnly>
        {legend && (
          <div className="absolute inset-x-3 bottom-16 z-[6] rounded-2xl border border-border bg-card/95 p-3 text-xs shadow-xl backdrop-blur" onClick={() => setLegend(false)}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {(["restaurant", "streetfood", "cafe", "icecream", "bar", "church", "palace", "museum"] as const).map((k) => (
                <span key={k} className="flex items-center gap-2"><i className="size-3 shrink-0 rounded-full border-2 border-white" style={{ background: PLACE_STYLE[k].color }} />{t(PLACE_STYLE[k].label)}</span>
              ))}
              <span className="flex items-center gap-2"><i className="size-3 shrink-0 rounded-full border-2 border-white bg-kind-bench" />{t("kind.bench")}</span>
              <span className="flex items-center gap-2"><i className="size-3 shrink-0 rounded-full border-2 border-green-600 bg-white" />{t("svc.pharmacy")}</span>
              <span className="flex items-center gap-2"><i className="size-3 shrink-0 rounded-full border-2 border-white bg-blue-700" />{t("svc.hospital")}</span>
              <span className="flex items-center gap-2"><i className="size-3 shrink-0 rounded-full border-2 border-white bg-blue-900" />{t("svc.police")} / {t("svc.carabinieri")}</span>
            </div>
          </div>
        )}
        </div>
        <div className="aura-tools relative z-[5] flex shrink-0 items-center justify-center gap-3 border-t border-border bg-card/95 px-3 py-2 backdrop-blur">
          <button type="button" title={t("map.locate")} aria-label={t("map.locate")} onClick={() => { if (!loc.active) void loc.start(); setRecenter((v) => v + 1); }} className="flex size-10 items-center justify-center rounded-full border border-border bg-card/90 shadow-lg backdrop-blur"><Crosshair className="size-5" /></button>
          <button type="button" title={t(mode === "auto" ? "map.auto" : mode === "day" ? "map.day" : "map.night")} aria-label={t("map.appearance")} onClick={() => selectMode(nextMode)} className="flex size-10 items-center justify-center rounded-full border border-border bg-card/90 shadow-lg backdrop-blur"><ModeIcon className="size-5" /></button>
          <button type="button" aria-label={t("map.legend")} onClick={() => setLegend((v) => !v)} className={`flex size-10 items-center justify-center rounded-full border border-border shadow-lg backdrop-blur ${legend ? "bg-primary text-primary-foreground" : "bg-card/90"}`}><Info className="size-5" /></button>
          <Link to="/quest" aria-label={t("quest.title")} className="flex size-10 items-center justify-center rounded-full border-2 border-yellow-300 bg-yellow-300 text-xl text-black shadow-lg">★</Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-24">

        {gardens.length > 0 && (
          <p className="mono-label mt-3">{t("garden.found", { n: found, t: gardens.length })}</p>
        )}

        {alerts.supported && !alerts.enabled && (
          <button
            type="button"
            onClick={alerts.enable}
            className="glass mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm"
          >
            <Bell className="size-4 shrink-0 text-primary" />
            <span className="flex-1">{t("prox.enable")}</span>
          </button>
        )}

        {kind === "services" && (
          <section className="mt-6">
            <p className="mono-label">{t("svc.nearest")}</p>
            <ul className="mt-3 space-y-2">
              {serviceList.map(({ s, d }) => {
                const meta = SERVICE_META[s.type];
                return (
                  <li key={s.id} className="glass flex items-center gap-3 rounded-2xl p-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-white" style={{ background: meta.color }}>
                      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: meta.symbol }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: meta.color }}>{t(meta.label)}</span>
                      <span className="block font-semibold leading-snug">{s.name ?? t(meta.label)}</span>
                      {s.address && <span className="block text-sm text-muted-foreground">{s.address}</span>}
                    </span>
                    {d != null && <span className="font-mono text-xs text-muted-foreground">{formatDistance(d)}</span>}
                    {s.phone && <a href={telHref(s.phone)} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">{t("svc.call")}</a>}
                    <a href={directionsUrl(s)} target="_blank" rel="noopener" className="rounded-full border border-border px-3 py-1.5 text-xs font-bold">➤</a>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <ul className="mt-6 space-y-3">
          {list.map(({ n, d }) => (
            <li key={n.id} className={`kind-${n.kind}`}>
              <Link
                to="/node/$slug"
                params={{ slug: n.slug }}
                className="glass group flex items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-accent/40"
              >
                {n.image_url ? (
                  <img src={n.image_url} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="kind-dot size-3 shrink-0 rounded-full" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="mono-label !text-[0.58rem]" style={{ color: "var(--kind)" }}>
                    {t(kindKey(n.kind))}
                  </p>
                  <p className="font-semibold leading-snug">{n.name}</p>
                  <p className="text-sm text-muted-foreground">{tagline(n, lang)}</p>
                </div>
                {d != null && <span className="font-mono text-xs text-muted-foreground">{formatDistance(d)}</span>}
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
