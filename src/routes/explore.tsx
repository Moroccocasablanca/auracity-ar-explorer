import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronRight, Crosshair, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapAppearanceControl, useMapAppearance } from "@/components/MapAppearanceControl";
import { useProximityAlerts } from "@/components/ProximityWatcher";
import { distanceM, formatDistance } from "@/lib/geo";
import { kindKey, useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { history, description, messagesQuery, nodesQuery, tagline, type NodeRow } from "@/lib/nodes";
import { explorePriority, matchesExploreFilter, type ExploreFilter } from "@/lib/explore-rules";
import { useNarrator } from "@/components/ListenButton";
import { isGardenObject } from "@/lib/node-rules";
import { discovered, markDiscovered } from "@/lib/discovered";

const BraMap = lazy(() => import("@/components/BraMap"));

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
  const { pos } = loc;
  const { mode, appearance, selectMode } = useMapAppearance();
  const [recenter, setRecenter] = useState(0);
  const { data: nodes = [] } = useQuery(nodesQuery);
  const [kind, setKind] = useState<ExploreFilter>("all");

  const list = useMemo(() => {
    return nodes
      .filter((n) => matchesExploreFilter(n, kind))
      .map((n) => ({ n, d: pos ? distanceM(pos, n) : null }))
      .sort((a, b) => explorePriority(a.n) - explorePriority(b.n) || (a.d != null && b.d != null ? a.d - b.d : a.n.name.localeCompare(b.n.name)));
  }, [nodes, kind, pos]);
  const filtered = useMemo(() => list.map((x) => x.n), [list]);
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
      if (n.kind === "monument") {
        play(n.id, { nodeId: n.id, source: "history" }, `${n.name}. ${history(n, lang) || description(n, lang)}`);
        return;
      }
      const msgs = await qc.fetchQuery(messagesQuery(n.id));
      const m = msgs[0];
      markDiscovered(n.id);
      if (m) play(n.id, { nodeId: n.id, source: "message", messageId: m.id }, m.body);
      else play(n.id, { nodeId: n.id, source: "history" }, `${n.name}. ${history(n, lang) || description(n, lang)}`);
    },
    [qc, play, playing, stop, lang],
  );
  const talkLabel = t("garden.talk");

  return (
    <div className="grid-backdrop min-h-screen px-4 pb-32 pt-10">
      <div className="mx-auto max-w-5xl">
        <p className="mono-label">Bra · Piemonte</p>
        <h1 className="mt-1 text-4xl font-bold">{t("explore.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("explore.sub")}</p>
        <p className="mono-label mt-2">{t("explore.count", { n: list.length })}</p>

        <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1">
          {(["all", "restaurants", "monument", "gardens", "business"] as const).map((k) => (
            <Button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              variant="outline"
              aria-pressed={kind === k}
              className={`shrink-0 rounded-md px-4 py-1.5 text-sm transition-colors ${
                kind === k
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "all" ? t("all") : k === "restaurants" ? t("explore.restaurants") : k === "gardens" ? t("explore.gardens") : t(kindKey(k))}
            </Button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <MapAppearanceControl mode={mode} onChange={selectMode} />
          <Button size="icon" variant="outline" title={t("map.locate")} aria-label={t("map.locate")} onClick={() => {
            if (!loc.active) void loc.start();
            setRecenter((v) => v + 1);
          }}><Crosshair /></Button>
        </div>
        <div className="relative mt-3 h-[58dvh] min-h-80 overflow-hidden rounded-lg border border-border">
          <ClientOnly fallback={<div className="h-full w-full animate-pulse bg-card/60" />}>
            <Suspense fallback={<div className="h-full w-full animate-pulse bg-card/60" />}>
              <BraMap nodes={filtered} pos={pos} kindLabel={kindLabel} appearance={appearance} recenter={recenter} onTalk={onTalk} talkLabel={talkLabel} speakingId={playing} />
            </Suspense>
          </ClientOnly>
          <span className="pointer-events-none absolute bottom-6 left-3 z-[500] inline-flex items-center gap-1 rounded-md bg-card px-2 py-1 text-xs text-foreground"><MapPin className="size-3" />Bra · {t(appearance === "day" ? "map.day" : "map.night")}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label={t("map.legend")}>
          <span><i className="mr-1 inline-block size-2 rounded-sm bg-kind-monument" />{t("kind.monument")}</span>
          <span><i className="mr-1 inline-block size-2 rounded-sm bg-kind-business" />{t("explore.restaurants")}</span>
          <span><i className="mr-1 inline-block size-2 rounded-sm bg-kind-bench" />{t("kind.bench")}</span>
        </div>

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
                  <p className="truncate font-semibold">{n.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{tagline(n, lang)}</p>
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
