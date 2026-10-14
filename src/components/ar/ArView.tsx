import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpRight, Crosshair, Lock, Power, Radio, Sparkles, Volume2 } from "lucide-react";
import { angleDiff, bearingDeg, distanceM, formatDistance } from "@/utils/geo";
import { kindKey, useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { messagesQuery, nodesQuery, tagline, type NodeRow } from "@/lib/nodes";
import { isGardenObject } from "@/lib/node-rules";
import { useNodeText } from "@/services/translate/use-node-text";
import { markDiscovered } from "@/lib/discovered";
import { GardenFace } from "@/components/ar/GardenCharacter";
import { useNarrator } from "@/components/ListenButton";
import { MonumentModel, MonumentSubtitles } from "@/components/ar/MonumentOverlay";
import { VoicePersona } from "@/services/voice/voice-persona";
import { bump } from "@/lib/merchant";
import { systemConfig, venueFeaturesEnabled } from "@/config/systemConfig";
import { VenueGreeter } from "@/components/ar/VenueGreeter";

const TALK_ANGLE = 12;
const TALK_DIST = 80;
const FAST_MPS = 2.5; // above brisk walking: pause AR for safety
const talked = new Set<string>();

const talks = (n: NodeRow) => n.kind === "monument" || isGardenObject(n);

/** Starts speaking once when the camera rests on a talking object: monuments tell their story, garden objects the latest message. */
function AutoTalk({ node, play }: { node: NodeRow; play: ReturnType<typeof useNarrator>["play"] }) {
  const tx = useNodeText(node);
  const garden = isGardenObject(node);
  const { data: messages, isPending, isError } = useQuery({ ...messagesQuery(node.id), enabled: garden });
  useEffect(() => {
    if (talked.has(node.id) || (garden && (isPending || isError))) return;
    const timer = window.setTimeout(() => {
      if (garden) {
        const m = messages?.[0];
        talked.add(node.id);
        markDiscovered(node.id);
        if (m) play(node.id, { nodeId: node.id, source: "message", messageId: m.id, persona: VoicePersona.HUNT_DYNAMIC }, m.body);
        else play(node.id, { nodeId: node.id, source: "history", persona: VoicePersona.HUNT_DYNAMIC }, `${tx.name}. ${tx.history || tx.description}`);
      } else {
        const text = `${tx.name}. ${tx.history || tx.description}`;
        talked.add(node.id);
        play(node.id, { nodeId: node.id, source: "history", persona: VoicePersona.MONUMENT_FEMALE, full: true }, text);
      }
    }, 1200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id, garden, isPending, isError, messages?.[0]?.id, tx.name, tx.history, tx.description, play]);
  return null;
}

const FOV = 70;
const RANGE_FREE = 250;

type Placed = { n: NodeRow; d: number; b: number };

export function ArView() {
  const { t, lang } = useI18n();
  const loc = useLocation();
  const { data: nodes = [] } = useQuery(nodesQuery);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOk, setCameraOk] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const drag = useRef<{ x: number; h: number } | null>(null);
  // The camera never opens without the visitor accepting the one-sentence safety notice, every time the AR screen is opened.
  const [safetyAsk, setSafetyAsk] = useState<"live" | "demo" | null>(null);
  const [consented, setConsented] = useState(false);
  const [closedGreet, setClosedGreet] = useState<string | null>(null);
  const { playing, play, stop } = useNarrator();
  const tooFast = !loc.demo && loc.speed != null && loc.speed > FAST_MPS;
  useEffect(() => {
    if (tooFast) stop();
  }, [tooFast, stop]);

  // Battery: the camera only runs while the page is visible and the user is not moving fast.
  const [pageVisible, setPageVisible] = useState(true);
  useEffect(() => {
    const onVis = () => setPageVisible(document.visibilityState === "visible");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  const cameraWanted = loc.active && consented && pageVisible && !tooFast;

  // Camera lifecycle
  useEffect(() => {
    if (!cameraWanted) {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      setCameraOk(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // Modest resolution and frame rate: the AR overlay does not need HD/60fps video.
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 960, max: 1280 },
            height: { ideal: 540, max: 720 },
            frameRate: { ideal: 24, max: 30 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraOk(true);
      } catch {
        setCameraOk(false);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, [cameraWanted]);

  useEffect(() => {
    if (cameraOk && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [cameraOk]);

  const placed = useMemo<Placed[]>(() => {
    if (!loc.pos) return [];
    const here = loc.pos;
    return nodes
      .filter((n) => n.kind !== "street")
      .map((n) => ({ n, d: distanceM(here, n), b: bearingDeg(here, n) }))
      .filter((p) => p.d <= RANGE_FREE)
      .sort((a, b) => b.d - a.d);
  }, [nodes, loc.pos]);

  const inView = placed.filter((p) => Math.abs(angleDiff(p.b, loc.heading)) < FOV / 2 + 10);
  // Never draw everything at once: nearest first, at most 5 labels, each at least 15° apart from the others, far shops only when close.
  const shown = useMemo(() => {
    const taken: number[] = [];
    const out: Placed[] = [];
    for (const p of [...inView].sort((a, b) => a.d - b.d)) {
      const rel = angleDiff(p.b, loc.heading);
      const forced = p.n.id === selected;
      if (!forced && (out.length >= 5 || (p.n.kind === "business" && p.d > 120) || taken.some((a) => Math.abs(a - rel) < 15))) continue;
      taken.push(rel);
      out.push(p);
    }
    return out.sort((a, b) => b.d - a.d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, Math.round(loc.heading / 3), selected]);
  const selectedItem = placed.find((p) => p.n.id === selected) ?? null;
  // autoPlayOnProximity: a monument starts telling its story once, when you are inside the radius (50 m).
  const nearMonument = tooFast ? null : placed.filter((p) => p.n.kind === "monument" && p.d <= systemConfig.proximityLoadingRadiusMeters).sort((a, b) => a.d - b.d)[0]?.n ?? null;
  // A bar or restaurant within reach: its mascot welcomes you and shows today's offer and 3D menu.
  const nearBiz = tooFast ? null : placed.filter((p) => p.n.kind === "business" && venueFeaturesEnabled(p.n.subscribed) && Math.max(0, p.d - Math.min(loc.accuracy, 40)) <= 60).sort((a, b) => a.d - b.d)[0]?.n ?? null;
  const speakingMonument = placed.find((p) => p.n.kind === "monument" && playing === p.n.id)?.n ?? null;
  const focus = tooFast
    ? null
    : inView
        .filter((p) => talks(p.n) && p.d <= TALK_DIST && Math.abs(angleDiff(p.b, loc.heading)) < TALK_ANGLE)
        .sort((a, b) => a.d - b.d)[0] ?? null;

  if (!loc.active || !consented) {
    return (
      <div className="grid-backdrop relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 pb-28 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="animate-aura-scan pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-transparent via-primary/15 to-transparent" />
        <div className="relative">
          <span className="absolute inset-0 m-auto size-24 rounded-full border border-primary/60 animate-aura-pulse" />
          <span className="absolute inset-0 m-auto size-24 rounded-full border border-primary/40 animate-aura-pulse [animation-delay:1.1s]" />
          <div className="relative flex size-24 items-center justify-center rounded-full border border-primary/50 bg-primary/10 shadow-[0_0_40px_var(--glow)]">
            <Radio className="size-9 text-primary" />
          </div>
        </div>
        <p className="mono-label mt-10">Pilot · Bra, IT</p>
        <h1 className="mt-2 text-5xl font-bold tracking-tight">
          AURA<span className="aura-text">CITY</span>
        </h1>
        <p className="mt-3 max-w-xs text-muted-foreground">{t("tagline")}</p>
        <p className="mt-6 max-w-sm text-sm text-muted-foreground">{t("ar.enter.sub")}</p>
        <button
          type="button"
          onClick={() => setSafetyAsk("live")}
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-[0_0_30px_var(--glow)] transition-transform active:scale-95"
        >
          <Sparkles className="size-4" /> {t("ar.enter")}
        </button>
        <button
          type="button"
          onClick={() => setSafetyAsk("demo")}
          className="mt-3 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t("ar.demo")}
        </button>
        {safetyAsk && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
            <div className="glass w-full max-w-sm space-y-4 rounded-2xl p-5 text-left">
              <p className="flex items-start gap-3 text-base font-semibold leading-snug">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-kind-business" /> {t("safety.cam.one")}
              </p>
              <button
                type="button"
                onClick={() => { const mode = safetyAsk; setSafetyAsk(null); setConsented(true); if (mode === "demo") void loc.start({ demo: true }); else void loc.start(); }}
                className="h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground"
              >
                {t("safety.cam.ok")}
              </button>
              <button type="button" onClick={() => setSafetyAsk(null)} className="w-full text-center text-sm text-muted-foreground">
                {t("safety.cam.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const range = RANGE_FREE;
  const notice =
    loc.demoReason === "outside"
      ? t("ar.outside")
      : loc.demoReason === "nogps"
        ? t("ar.nogps")
        : loc.demoReason === "manual"
          ? t("ar.demo.note")
          : !cameraOk
            ? t("ar.nocamera")
            : null;

  return (
    <div
      className="relative h-[100dvh] touch-none select-none overflow-hidden bg-background"
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, h: loc.heading };
      }}
      onPointerMove={(e) => {
        if (!drag.current || !(loc.demo || !cameraOk)) return;
        loc.setHeading(drag.current.h - (e.clientX - drag.current.x) * 0.25);
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      {/* Reality layer */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 size-full object-cover transition-opacity ${cameraOk ? "opacity-100" : "opacity-0"}`}
      />
      <div className="grid-backdrop absolute inset-0" style={{ backgroundPositionX: `${-loc.heading * 6}px` }} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background/80" />

      {/* Horizon line */}
      <div className="pointer-events-none absolute inset-x-0 top-[66%] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* AR nodes */}
      {shown.map((p, i) => {
        const rel = angleDiff(p.b, loc.heading);
        const ratio = p.d / range;
        const left = 50 + (rel / FOV) * 100;
        const top = 68 + (1 - ratio) * 14 - (i % 3) * 5;
        const scale = 1 - ratio * 0.28;
        const near = Math.max(0, p.d - Math.min(loc.accuracy, 30)) <= p.n.radius_m;
        const sel = selected === p.n.id;
        return (
          <button
            key={p.n.id}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => { if (!sel && p.n.kind === "business") bump(p.n.id, "totalArViews"); setSelected(sel ? null : p.n.id); }}
            className={`kind-${p.n.kind} absolute -translate-x-1/2 -translate-y-full text-left`}
            style={{ left: `${left}%`, top: `${top}%`, transform: `translate(-50%, -100%) scale(${scale})` }}
          >
            {isGardenObject(p.n) && (
              <div className="mx-auto mb-1 flex justify-center">
                <GardenFace kind={p.n.kind} speaking={playing === p.n.id} size={56} />
              </div>
            )}
            <div className={`ar-chip flex max-w-[11rem] flex-col rounded-2xl px-3 py-2 ${sel ? "ring-2 ring-primary" : ""}`}>
              <span className="kind-text mono-label !text-[0.58rem]" style={{ color: "var(--kind)" }}>
                {t(kindKey(p.n.kind))}
              </span>
              <span className="flex items-center gap-1 truncate text-sm font-semibold leading-tight">
                {playing === p.n.id && <Volume2 className="size-3.5 shrink-0 animate-pulse text-primary" />}
                {p.n.name}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[0.65rem] text-muted-foreground">
                {p.d < loc.accuracy ? t("ar.here") : `~${formatDistance(p.d)}`}
                {near && <span className="rounded-full bg-success/20 px-1.5 text-success">{t("ar.inrange")}</span>}
              </span>
            </div>
            <div className="kind-line mx-auto h-14 w-px" />
            <div className="relative mx-auto -mt-0.5 size-2">
              <span className="kind-dot absolute inset-0 rounded-full" />
              <span className="kind-ring animate-aura-pulse absolute inset-0 rounded-full border" />
            </div>
          </button>
        );
      })}

      {/* Top HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="glass pointer-events-auto rounded-2xl px-3 py-2">
          <p className="mono-label !text-[0.6rem]">AURACITY · BRA</p>
          <p className="text-sm font-semibold">
            {placed.length} <span className="font-normal text-muted-foreground">{t("ar.nearby")}</span>
          </p>
          <p className="mono-label mt-0.5 !text-[0.58rem]">
            {t("ar.range")} {range} m · <Lock className="inline size-2.5" /> 1 km
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Radar placed={placed} heading={loc.heading} range={range} />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => { setConsented(false); loc.stop(); }}
            className="glass pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
          >
            <Power className="size-3.5" /> {t("ar.stop")}
          </button>
        </div>
      </div>

      {focus && <AutoTalk key={focus.n.id} node={focus.n} play={play} />}

      {/* Safety reminder */}
      <div className="pointer-events-none absolute inset-x-0 top-[max(6.5rem,calc(env(safe-area-inset-top)+6rem))] flex justify-center px-4">
        <p className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.7rem] text-kind-business">
          <AlertTriangle className="size-3.5" /> {t("safety.banner")}
        </p>
      </div>
      {tooFast && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/90 p-6 text-center">
          <p className="max-w-xs text-base font-medium">{t("safety.paused")}</p>
        </div>
      )}

      {/* Center reticle */}
      <Crosshair className="pointer-events-none absolute left-1/2 top-[66%] size-5 -translate-x-1/2 -translate-y-1/2 text-primary/60" />

      {notice && !selectedItem && (
        <div className="glass pointer-events-none absolute inset-x-4 bottom-24 mx-auto max-w-sm rounded-xl px-3 py-2 text-center text-xs text-muted-foreground">
          {notice}
        </div>
      )}
      {placed.length === 0 && (
        <div className="glass absolute inset-x-6 top-1/2 mx-auto max-w-xs rounded-xl px-4 py-3 text-center text-sm">
          {t("ar.none")}
        </div>
      )}

      {nearMonument && !talked.has(nearMonument.id) && <AutoTalk node={nearMonument} play={play} />}
      {speakingMonument && <MonumentSubtitles node={speakingMonument} bottomClass={selectedItem ? "bottom-[13.5rem]" : "bottom-28"} />}

      {nearBiz && closedGreet !== nearBiz.id && !selectedItem && <VenueGreeter key={nearBiz.id} node={nearBiz} onClose={() => setClosedGreet(nearBiz.id)} />}

      {/* Selected node card */}
      {selectedItem && (
        <div
          className={`glass kind-${selectedItem.n.kind} absolute inset-x-4 bottom-24 mx-auto max-w-md rounded-2xl p-4`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mono-label !text-[0.6rem]" style={{ color: "var(--kind)" }}>
                {t(kindKey(selectedItem.n.kind))} · {formatDistance(selectedItem.d)}
              </p>
              <h3 className="truncate text-lg font-semibold">{selectedItem.n.name}</h3>
              <p className="truncate text-sm text-muted-foreground">{tagline(selectedItem.n, lang)}</p>
              {selectedItem.n.kind === "monument" && <MonumentModel slug={selectedItem.n.slug} />}
            </div>
            <Link
              to="/node/$slug"
              params={{ slug: selectedItem.n.slug }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {t("ar.open")} <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Radar({ placed, heading, range }: { placed: Placed[]; heading: number; range: number }) {
  const c = 42;
  return (
    <svg width={84} height={84} viewBox="0 0 84 84" className="glass pointer-events-none rounded-full" aria-hidden>
      <circle cx={c} cy={c} r={38} fill="none" stroke="currentColor" className="text-border" />
      <circle cx={c} cy={c} r={19} fill="none" stroke="currentColor" className="text-border" />
      <path
        d={`M${c} ${c} L${c - 22} ${c - 31} A38 38 0 0 1 ${c + 22} ${c - 31} Z`}
        className="fill-primary/20"
      />
      {placed.map((p) => {
        const a = ((p.b - heading) * Math.PI) / 180;
        const r = Math.min(1, p.d / range) * 36;
        return (
          <circle
            key={p.n.id}
            cx={c + r * Math.sin(a)}
            cy={c - r * Math.cos(a)}
            r={2.4}
            className={`kind-${p.n.kind}`}
            style={{ fill: "var(--kind)" }}
          />
        );
      })}
      <circle cx={c} cy={c} r={2.5} className="fill-foreground" />
    </svg>
  );
}
