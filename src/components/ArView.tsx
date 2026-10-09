import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Crosshair, Lock, Power, Radio, Sparkles } from "lucide-react";
import { angleDiff, bearingDeg, distanceM, formatDistance } from "@/lib/geo";
import { kindKey, useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { nodesQuery, tagline, type NodeRow } from "@/lib/nodes";

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

  // Camera lifecycle
  useEffect(() => {
    if (!loc.active) {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      setCameraOk(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
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
  }, [loc.active]);

  useEffect(() => {
    if (cameraOk && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [cameraOk]);

  const placed = useMemo<Placed[]>(() => {
    if (!loc.pos) return [];
    const here = loc.pos;
    return nodes
      .map((n) => ({ n, d: distanceM(here, n), b: bearingDeg(here, n) }))
      .filter((p) => p.d <= RANGE_FREE)
      .sort((a, b) => b.d - a.d);
  }, [nodes, loc.pos]);

  const inView = placed.filter((p) => Math.abs(angleDiff(p.b, loc.heading)) < FOV / 2 + 10);
  const selectedItem = placed.find((p) => p.n.id === selected) ?? null;

  if (!loc.active) {
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
          onClick={() => loc.start()}
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-[0_0_30px_var(--glow)] transition-transform active:scale-95"
        >
          <Sparkles className="size-4" /> {t("ar.enter")}
        </button>
        <button
          type="button"
          onClick={() => loc.start({ demo: true })}
          className="mt-3 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t("ar.demo")}
        </button>
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
      {inView.map((p, i) => {
        const rel = angleDiff(p.b, loc.heading);
        const ratio = p.d / range;
        const left = 50 + (rel / FOV) * 100;
        const top = 60 - ratio * 30 + ((i % 3) - 1) * 4;
        const scale = 1 - ratio * 0.28;
        const near = p.d <= p.n.radius_m;
        const sel = selected === p.n.id;
        return (
          <button
            key={p.n.id}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setSelected(sel ? null : p.n.id)}
            className={`kind-${p.n.kind} absolute -translate-x-1/2 -translate-y-full text-left`}
            style={{ left: `${left}%`, top: `${top}%`, transform: `translate(-50%, -100%) scale(${scale})` }}
          >
            <div className={`ar-chip flex max-w-[11rem] flex-col rounded-2xl px-3 py-2 ${sel ? "ring-2 ring-primary" : ""}`}>
              <span className="kind-text mono-label !text-[0.58rem]" style={{ color: "var(--kind)" }}>
                {t(kindKey(p.n.kind))}
              </span>
              <span className="truncate text-sm font-semibold leading-tight">{p.n.name}</span>
              <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[0.65rem] text-muted-foreground">
                {formatDistance(p.d)}
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
            onClick={() => loc.stop()}
            className="glass pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
          >
            <Power className="size-3.5" /> {t("ar.stop")}
          </button>
        </div>
      </div>

      {/* Center reticle */}
      <Crosshair className="pointer-events-none absolute left-1/2 top-[66%] size-5 -translate-x-1/2 -translate-y-1/2 text-primary/60" />

      {notice && (
        <div className="glass absolute inset-x-4 top-28 mx-auto max-w-sm rounded-xl px-3 py-2 text-center text-xs text-muted-foreground">
          {notice}
        </div>
      )}
      {placed.length === 0 && (
        <div className="glass absolute inset-x-6 top-1/2 mx-auto max-w-xs rounded-xl px-4 py-3 text-center text-sm">
          {t("ar.none")}
        </div>
      )}

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
