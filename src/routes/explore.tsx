import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Heart, PartyPopper, Zap, Search, ChevronRight, Pill, Crosshair, Dumbbell, Info, Landmark, LayoutGrid, Moon, ShieldPlus, Store, Sun, SunMoon, TreePine, Utensils } from "lucide-react";
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
import { speakAny, speakOrBackup } from "@/services/voice/speech";
import { chatterFor, warmChatter } from "@/lib/daily-chatter";
import { messageIn, nodeTextIn } from "@/lib/localize";
import { VoicePersona } from "@/services/voice/voice-persona";
import { contentLang, detectTextLang, greetingWithName, learnNameLangs, nameLanguage, nameThenText } from "@/services/voice/text-speech";
import { cachedNodes, history, description, nodeMenu, promo, messagesQuery, nodesQuery, tagline, type NodeRow } from "@/lib/nodes";
import { explorePriority, matchesExploreFilter, type ExploreFilter } from "@/lib/explore-rules";
import { useNarrator } from "@/components/ListenButton";
import { isGardenObject } from "@/lib/node-rules";
import { discovered, markDiscovered } from "@/lib/discovered";
import { directionsUrl, isEssential, SERVICES, SERVICE_META, telHref, type ServicePlace } from "@/lib/services";
import { ACTIVITIES, ACTIVITY_META } from "@/lib/activities";
import type { Poi } from "@/lib/poi";
import { dutyNow, useDuty } from "@/lib/duty";
import { DutyCard } from "@/components/DutyCard";
import { MapSearch } from "@/components/map/MapSearch";
import { Ico } from "@/components/Ico";
import { CategoryOrbit } from "@/components/map/CategoryOrbit";
import { useFavorites } from "@/lib/favorites";
import { useFlashVenues } from "@/lib/merchant";
import { logEvent } from "@/lib/quest";

const loadMap = () => import("@/components/map/BraMap");
const BraMap = lazy(loadMap);
// Start downloading the map code (the biggest piece) as soon as this page's code runs, not after the data and the first render.
if (typeof window !== "undefined") void loadMap();

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Esplora Bra — AURACITY" },
      {
        name: "description",
        content: "La mappa 3D di Bra: monumenti, locali, giardini parlanti, farmacia di turno e servizi vicino a te.",
      },
      { property: "og:title", content: "Esplora Bra — AURACITY" },
      {
        property: "og:description",
        content: "La mappa 3D di Bra: monumenti, locali, giardini parlanti, farmacia di turno e servizi vicino a te.",
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
  const queryClient = useQueryClient();
  // Show the places from the last visit immediately (after hydration), while the fresh list loads.
  useEffect(() => {
    if (!queryClient.getQueryData(nodesQuery.queryKey)) {
      const c = cachedNodes();
      if (c) queryClient.setQueryData(nodesQuery.queryKey, c);
    }
  }, [queryClient]);
  const { data: nodes = [] } = useQuery(nodesQuery);
  useEffect(() => { void learnNameLangs(nodes.filter((n) => n.kind === "business").map((n) => n.name)); }, [nodes]);
  const [kind, setKind] = useState<ExploreFilter>("all");
  const favs = useFavorites();
  useEffect(() => {
    warmChatter();
    // Quietly bring the funny camera's engine to the phone while the map is open, so "Effetti" opens at once. About half a minute after the map, one time.
    const id = window.setTimeout(() => void import("@/components/fun/engine").then((m) => m.warmEngine()), 30_000);
    return () => window.clearTimeout(id);
  }, []);
  const flash = useFlashVenues();
  // A filter that is only offered while it has something to show (flash offers, favourites) must not stay switched on once it is empty: the map would look empty.
  useEffect(() => {
    if ((kind === "flash" && Object.keys(flash).length === 0) || (kind === "favorites" && favs.ids.length === 0)) setKind("all");
  }, [kind, flash, favs.ids]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);

  const list = useMemo(() => {
    return nodes
      .filter((n) => (kind === "favorites" ? favs.has(n.id) : kind === "flash" ? flash[n.id] != null : matchesExploreFilter(n, kind)))
      .map((n) => ({ n, d: pos ? distanceM(pos, n) : null }))
      .sort((a, b) => explorePriority(a.n) - explorePriority(b.n) || (a.d != null && b.d != null ? a.d - b.d : a.n.name.localeCompare(b.n.name)));
  }, [nodes, kind, pos, favs.ids, flash]);
  // The places drawn on the map do NOT depend on your position: if they did, every GPS update (many per minute on a phone) would hand the map a new list
  // and it would rebuild every marker, so nothing could be touched. Same list, same order -> same array.
  const filtered = useMemo(
    () => nodes.filter((n) => (kind === "favorites" ? favs.has(n.id) : kind === "flash" ? flash[n.id] != null : matchesExploreFilter(n, kind))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, kind, favs.ids, flash],
  );
  // Services: essentials are always on the map; defibrillators only in the Services filter.
  const duty = useDuty();
  const dutyList = useMemo(() => (duty?.status === "ok" ? dutyNow(duty) : []), [duty]);
  // Only the pharmacy open right now is shown as "di turno" (never the day one at night). If none is open, all of today's.
  const dutyShown = useMemo(() => (dutyList.some((d) => d.active) ? dutyList.filter((d) => d.active) : dutyList), [dutyList]);
  const dutyIds = useMemo(() => new Set(dutyShown.flatMap((d) => (d.place ? [d.place.id] : []))), [dutyShown]);
  const mapServices = useMemo(
    () => (kind === "services" ? SERVICES : kind === "all" ? SERVICES.filter((s) => isEssential(s) || dutyIds.has(s.id)) : kind === "duty" ? SERVICES.filter((s) => dutyIds.has(s.id)) : []),
    [kind, dutyIds],
  );
  // Activities: gyms, sports centres, playgrounds... (all in "Sport & leisure", playgrounds also under the kids' gardens)
  const mapActivities = useMemo(
    () => (kind === "activities" ? ACTIVITIES : kind === "gardens" ? ACTIVITIES.filter((a) => a.type === "playground") : kind === "all" ? ACTIVITIES.filter((a) => a.type === "gym" || a.type === "pool") : []),
    [kind],
  );
  const pois = useMemo<Poi[]>(
    () => [
      ...mapServices.map((s) => {
        const m = SERVICE_META[s.type];
        if (dutyIds.has(s.id)) return { id: s.id, lat: s.lat, lng: s.lng, title: s.name ?? null, tag: t("svc.duty"), color: "#15803d", bg: "#16a34a", fg: "#ffffff", symbol: m.symbol, icon: m.icon, duty: true, minZoom: 13.5, phone: s.phone, address: s.address, hours: s.hours };
        return { id: s.id, lat: s.lat, lng: s.lng, title: s.name ?? null, tag: t(m.label), color: m.color, bg: m.bg, fg: m.fg, symbol: m.symbol, icon: m.icon, minZoom: Math.max(m.minZoom ?? 0, kind === "services" || kind === "duty" ? 14 : 16.5), phone: s.phone, address: s.address, hours: s.hours };
      }),
      ...mapActivities.map((a) => {
        const m = ACTIVITY_META[a.type];
        return { id: a.id, lat: a.lat, lng: a.lng, title: a.name ?? t(m.label), tag: t(m.label), color: m.color, bg: m.color, fg: "#ffffff", symbol: m.symbol, icon: m.icon, minZoom: kind === "activities" ? 14 : m.minZoom, phone: a.phone, address: a.address, hours: a.hours, open: `/attivita/${a.id}` };
      }),
    ],
    [mapServices, mapActivities, kind, t, dutyIds],
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
        // the invitation of the venue in the visitor's language; the name of the venue is pronounced in ITS own language, the dish names stay as they are
        const items = nodeMenu(n).slice(0, 6).map((m) => m.name).join(", ");
        const inv = await nodeTextIn(n, "promo", lang);
        const body = [inv.text, items && `${t("node.menu")}: ${items}`].filter(Boolean).join(". ");
        const spoken = inv.text ? inv.lang : lang;
        void speakAny(nameThenText(n.name, body, spoken, nameLanguage(n.name, n.kind)), spoken, undefined, VoicePersona.BUSINESS_USER);
        return;
      }
      if (n.kind === "monument") {
        logEvent("monument", n.id);
        // Monuments tell their COMPLETE story, start to finish: the name stays Italian, the story is in the language you chose.
        const st = await nodeTextIn(n, "story", lang);
        play(n.id, { nodeId: n.id, source: "history", lang: st.lang, persona: VoicePersona.MONUMENT_FEMALE, full: true }, nameThenText(n.name, st.text, st.lang));
        return;
      }
      const msgs = await qc.fetchQuery(messagesQuery(n.id));
      const m = msgs[0];
      markDiscovered(n.id);
      if (!m) {
        // No message left by visitors: the object tells its own story, with the recorded young voice (instant, no waiting for the server).
        const st = await nodeTextIn(n, "story", lang);
        const recorded = () => { if (st.text) play(n.id, { nodeId: n.id, source: "history", lang: st.lang, persona: VoicePersona.HUNT_DYNAMIC }, nameThenText(n.name, st.text, st.lang)); };
        // What it says changes every day: a new greeting and a new riddle / joke / curiosity (the recorded story is the backup), in the language you chose.
        // Fresh line only when its voice is ready (instant); otherwise the recorded story starts AT ONCE and the fresh voice is prepared for the next tap.
        const today = await chatterFor(n, nodes, lang);
        // today's new line always wins: the free voice prepares it in a moment when it is not ready yet (no more yesterday's recording every day)
        if (today) { stop(); speakOrBackup(today.text, today.lang, recorded, undefined, VoicePersona.HUNT_DYNAMIC); return; }
        if (st.text) recorded();
        else void speakAny(greetingWithName(t("garden.hello", { name: "§" }), n.name, lang, t("garden.empty")), lang, undefined, VoicePersona.HUNT_DYNAMIC);
        return;
      }
      // visitors write in any language: the message is read in the language you chose
      const said = await messageIn(m.body, lang);
      play(n.id, { nodeId: n.id, source: "message", messageId: m.id, persona: VoicePersona.HUNT_DYNAMIC, lang: said.text === m.body ? detectTextLang(m.body, lang) : said.lang }, said.text);
    },
    [qc, play, playing, stop, lang, nodes],
  );
  const talkLabel = t("garden.talk");

  const [legend, setLegend] = useState(false);
  const modes: MapMode[] = ["auto", "day", "night"];
  const nextMode = modes[(modes.indexOf(mode) + 1) % 3]!;
  const ModeIcon = mode === "auto" ? SunMoon : mode === "day" ? Sun : Moon;
  const chips = [...(Object.keys(flash).length ? (["flash"] as const) : []), ...(favs.ids.length ? (["favorites"] as const) : []), "all", "duty", "restaurants", "monument", "gardens", "business", "activities", "services"] as const;
  const chipIcon = { flash: Zap, favorites: Heart, all: LayoutGrid, restaurants: Utensils, monument: Landmark, gardens: TreePine, business: Store, activities: Dumbbell, services: ShieldPlus, duty: Pill } as const;
  const chipEmoji = { flash: "high_voltage", favorites: "red_heart", all: "sparkles", duty: "pill", restaurants: "spaghetti", monument: "classical_building", gardens: "deciduous_tree", business: "shopping_bags", activities: "soccer_ball", services: "ambulance" } as const;
  const chipLabel = (k: (typeof chips)[number]) => (k === "all" ? t("all") : k === "flash" ? t("explore.flash") : k === "favorites" ? t("explore.favorites") : k === "restaurants" ? t("explore.restaurants") : k === "gardens" ? t("explore.gardens") : k === "services" ? t("explore.services") : k === "duty" ? t("explore.duty") : k === "activities" ? t("explore.activities") : t(kindKey(k)));

  return (
    <div className="min-h-screen pb-28">
      <h1 className="sr-only">{t("explore.h1")}</h1>
      {/* The map is the first thing you see: as tall as the screen, with its controls floating on top. */}
      <div className="flex h-[calc(100dvh-6.8rem)] min-h-[26rem] w-full flex-col bg-card/60">
        <div className="relative z-[2000] shrink-0 border-b border-border bg-card/95 px-3 pb-2 pt-[max(0.55rem,env(safe-area-inset-top))] backdrop-blur">
          {/* the search button and the orbit of categories (touch the orb: the others circle around it) */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSearching((v) => !v)} aria-label={t("search.ph")} aria-expanded={searching} className={`flex size-12 shrink-0 items-center justify-center rounded-2xl border shadow-lg transition active:scale-90 ${searching ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card/80"}`}>
              <Search className="size-5" />
            </button>
            <CategoryOrbit items={chips.map((k) => ({ key: k, label: chipLabel(k), icon: chipEmoji[k] }))} value={kind} onChange={(k) => { setKind(k as ExploreFilter); setPicked(null); }} />
          </div>
          {searching && <MapSearch nodes={nodes} pos={pos} onPick={(h) => { setKind("all"); setPicked({ lat: h.lat, lng: h.lng }); }} onClose={() => setSearching(false)} />}
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden">
        <ClientOnly fallback={<div className="h-full w-full animate-pulse bg-card/60" />}>
          <Suspense fallback={<div className="h-full w-full animate-pulse bg-card/60" />}>
            <BraMap fit={kind} flash={flash} nodes={filtered} pos={pos} kindLabel={kindLabel} placeLabel={(n) => t(placeStyle(n).label)} appearance={appearance} recenter={recenter} focus={picked ?? (kind === "duty" ? dutyShown[0]?.place ?? null : null)} onTalk={onTalk} talkLabel={talkLabel} pois={pois} poiText={{ call: t("svc.call"), directions: t("svc.directions"), open: t("act.open") }} readLabel={t("venue.read")} openLabel={(o) => t(o ? "node.open" : "node.closed")} speakingId={playing} me={{ label: t("map.me"), accuracy: loc.accuracy, heading: loc.heading, avatar: myAvatar, name: myName, ring: myRing }} />
          </Suspense>
        </ClientOnly>
        {legend && (
          <div className="absolute inset-x-3 bottom-16 z-[6] rounded-2xl border border-border bg-card/95 p-3 text-xs shadow-xl backdrop-blur" onClick={() => setLegend(false)}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {(["church", "palace", "townhall", "museum", "castle", "memorial", "park", "restaurant", "streetfood", "cafe", "icecream", "bar", "shop"] as const).map((k) => (
                <span key={k} className="flex items-center gap-2"><i className="aura-legend-ico" style={{ background: PLACE_STYLE[k].color }}><img src={`/icons3d/${PLACE_STYLE[k].icon}.webp`} alt="" /></i>{t(PLACE_STYLE[k].label)}</span>
              ))}
              {(["pharmacy", "hospital", "police", "carabinieri", "fire", "aed", "bank", "post", "deli", "wine"] as const).map((k) => (
                <span key={k} className="flex items-center gap-2"><i className="aura-legend-ico" style={{ background: SERVICE_META[k].color }}><img src={`/icons3d/${SERVICE_META[k].icon}.webp`} alt="" /></i>{t(SERVICE_META[k].label)}</span>
              ))}
            </div>
          </div>
        )}
        </div>
        <div className="aura-tools relative z-[5] flex shrink-0 items-center justify-center gap-4 border-t border-border bg-card/95 px-3 py-2">
          <button type="button" title={t("map.locate")} aria-label={t("map.locate")} onClick={() => { if (!loc.active) void loc.start(); setRecenter((v) => v + 1); }} className="aura-tool"><Ico n="round_pushpin" className="size-6" /></button>
          <button type="button" title={t(appearance === "day" ? "map.day" : "map.night")} aria-label={t("map.appearance")} onClick={() => selectMode(appearance === "day" ? "night" : "day")} className="aura-tool"><Ico n={appearance === "day" ? "sun" : "crescent_moon"} className="size-6" /></button>
          <button type="button" aria-label={t("map.legend")} onClick={() => setLegend((v) => !v)} className={`aura-tool ${legend ? "is-on" : ""}`}><Ico n="information" className="size-6" /></button>
          <Link to="/fun" aria-label={t("fun.title")} className="aura-tool"><Ico n="party_popper" className="size-6" /></Link>
          <Link to="/quest" aria-label={t("quest.title")} className="aura-tool"><Ico n="star" className="size-6" /></Link>
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

        {(kind === "duty" || kind === "all" || kind === "services") && <DutyCard duty={duty} list={dutyList} full={kind === "duty"} />}

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
