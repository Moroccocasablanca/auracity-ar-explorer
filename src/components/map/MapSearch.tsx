import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useI18n, kindKey } from "@/lib/i18n";
import type { NodeRow } from "@/lib/nodes";
import { SERVICES, SERVICE_META } from "@/lib/services";
import { ACTIVITIES, ACTIVITY_META } from "@/lib/activities";
import { distanceM, formatDistance } from "@/utils/geo";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

type Hit = { id: string; name: string; sub: string; lat: number; lng: number; slug?: string; d: number | null };

/** Search box of the map: type part of a name (accents and capitals do not matter) and fly to the place. */
export function MapSearch({ nodes, pos, onPick, onClose }: { nodes: NodeRow[]; pos: { lat: number; lng: number } | null; onPick: (h: { lat: number; lng: number }) => void; onClose: () => void }) {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  const index = useMemo(() => {
    const all: (Hit & { key: string })[] = [];
    for (const n of nodes) all.push({ id: n.id, name: n.name, sub: t(kindKey(n.kind)), lat: n.lat, lng: n.lng, slug: n.slug, d: null, key: norm(`${n.name} ${n.address} ${lang === "it" ? n.tagline_it : n.tagline_en}`) });
    for (const s of SERVICES) if (s.name) all.push({ id: s.id, name: s.name, sub: t(SERVICE_META[s.type].label), lat: s.lat, lng: s.lng, d: null, key: norm(`${s.name} ${s.address ?? ""} ${t(SERVICE_META[s.type].label)}`) });
    for (const a of ACTIVITIES) if (a.name) all.push({ id: a.id, name: a.name, sub: t(ACTIVITY_META[a.type].label), lat: a.lat, lng: a.lng, d: null, key: norm(`${a.name} ${a.address ?? ""} ${t(ACTIVITY_META[a.type].label)}`) });
    return all;
  }, [nodes, t, lang]);

  const hits = useMemo(() => {
    const words = norm(q).split(" ").filter(Boolean);
    if (!words.length) return [] as Hit[];
    return index
      .filter((h) => words.every((w) => h.key.includes(w)))
      .map((h) => ({ ...h, d: pos ? distanceM(pos, h) : null, starts: h.key.startsWith(words[0]!) ? 0 : 1 }))
      .sort((a, b) => a.starts - b.starts || (a.d ?? 0) - (b.d ?? 0))
      .slice(0, 8);
  }, [q, index, pos]);

  return (
    <div className="absolute inset-x-3 top-full z-20 mt-1 rounded-2xl border border-border bg-card/95 p-2 shadow-2xl backdrop-blur" role="search">
      <div className="flex items-center gap-2 rounded-xl bg-background/60 px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search.ph")} aria-label={t("search.ph")} enterKeyHint="search" className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" />
        <button type="button" onClick={onClose} aria-label={t("search.close")} className="flex size-8 items-center justify-center rounded-full"><X className="size-4" /></button>
      </div>
      {q.trim() && (
        <ul className="mt-1 max-h-[45dvh] overflow-y-auto">
          {hits.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">{t("search.none")}</li>}
          {hits.map((h) => (
            <li key={h.id} className="flex items-center gap-1">
              <button type="button" onClick={() => { onPick(h); onClose(); }} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left active:bg-accent/40">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold leading-snug">{h.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{h.sub}</span>
                </span>
                {h.d != null && <span className="font-mono text-xs text-muted-foreground">{formatDistance(h.d)}</span>}
              </button>
              {h.slug && <Link to="/node/$slug" params={{ slug: h.slug }} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold">{t("search.open")}</Link>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
