import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, Footprints, MapPin, Navigation, RotateCcw } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { ListenButton } from "@/components/ListenButton";
import { useI18n } from "@/lib/i18n";
import { useLocation, BRA_CENTER } from "@/lib/location";
import { nodesQuery, type NodeRow } from "@/lib/nodes";
import { buildTour, loadDone, saveDone, walkingUrl } from "@/lib/tour";
import { formatDistance } from "@/utils/geo";
import { useNodeText } from "@/services/translate/use-node-text";
import { nameThenText } from "@/services/voice/text-speech";
import { personaForKind } from "@/services/voice/voice-persona";

export const Route = createFileRoute("/tour")({
  head: () => ({
    meta: [
      { title: "Passeggiata di Bra · AURACITY" },
      { name: "description", content: "Passeggiata guidata tra i monumenti di Bra: percorso a piedi con la storia da ascoltare a ogni tappa." },
    ],
  }),
  component: TourPage,
});

function TourPage() {
  const { t } = useI18n();
  const { pos, start } = useLocation();
  const { data: nodes = [] } = useQuery(nodesQuery);
  const from = pos ?? BRA_CENTER;
  // the order is fixed when the walk starts, so it does not jump around while you walk
  const [anchor, setAnchor] = useState(from);
  useEffect(() => { if (pos && anchor === BRA_CENTER) setAnchor(pos); }, [pos, anchor]);
  const monuments = useMemo(() => nodes.filter((n) => n.kind === "monument"), [nodes]);
  const tour = useMemo(() => buildTour(monuments, anchor), [monuments, anchor]);
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => setDone(loadDone()), []);
  const toggle = (id: string) => setDone((d) => { const n = d.includes(id) ? d.filter((x) => x !== id) : [...d, id]; saveDone(n); return n; });
  const reset = () => { setDone([]); saveDone([]); setAnchor(pos ?? BRA_CENTER); };
  const visited = tour.stops.filter((s) => done.includes(s.place.id)).length;
  const nextIdx = tour.stops.findIndex((s) => !done.includes(s.place.id));
  const pct = tour.stops.length ? Math.round((visited / tour.stops.length) * 100) : 0;

  return (
    <div className="grid-backdrop min-h-screen px-4 pb-36 pt-10">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="space-y-2">
          <p className="mono-label flex items-center gap-2"><Footprints className="size-4" /> AURACITY</p>
          <h1 className="text-3xl font-bold">{t("tour.title")}</h1>
          <p className="text-muted-foreground">{t("tour.sub")}</p>
          {tour.stops.length > 0 && (
            <p className="font-mono text-sm">{t("tour.stats", { n: tour.stops.length, km: (tour.totalM / 1000).toFixed(1).replace(".", ","), min: tour.minutes })}</p>
          )}
        </header>

        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 text-sm">
          <MapPin className="size-5 shrink-0 text-primary" />
          <span className="flex-1">{pos ? t("tour.from.here") : t("tour.from.center")}</span>
          {!pos && <button type="button" onClick={() => void start()} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">{t("tour.locate")}</button>}
        </div>

        {tour.stops.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground"><span>{t("tour.progress", { d: visited, n: tour.stops.length })}</span><span>{pct}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
          </div>
        )}

        {tour.stops.length === 0 && <p className="text-muted-foreground">{t("tour.empty")}</p>}
        {tour.stops.length > 0 && nextIdx === -1 && (
          <div className="rounded-2xl border border-success/50 bg-success/10 p-4 text-center font-semibold">{t("tour.finished")}</div>
        )}

        <ol className="space-y-3">
          {tour.stops.map((s, i) => (
            <Stop key={s.place.id} node={s.place} n={i + 1} legM={s.legM} next={i === nextIdx} done={done.includes(s.place.id)} onToggle={() => toggle(s.place.id)} />
          ))}
        </ol>

        {visited > 0 && (
          <button type="button" onClick={reset} className="mx-auto flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm"><RotateCcw className="size-4" /> {t("tour.reset")}</button>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function Stop({ node, n, legM, next, done, onToggle }: { node: NodeRow; n: number; legM: number; next: boolean; done: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  const tx = useNodeText(node);
  const story = tx.history || tx.description;
  return (
    <li className={`rounded-2xl border p-4 transition ${next ? "border-primary bg-primary/10 shadow-lg" : "border-border bg-card/60"} ${done ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold ${done ? "bg-success text-black" : next ? "bg-primary text-primary-foreground" : "border border-border"}`}>{done ? <Check className="size-4" /> : n}</span>
        <div className="min-w-0 flex-1">
          {next && <p className="mono-label text-primary">{t("tour.next")}</p>}
          <p className="font-semibold leading-snug">{tx.name}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">+{formatDistance(legM)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ListenButton compact text={nameThenText(node.name, story, tx.speakLang)} voice={{ nodeId: node.id, source: "history", lang: tx.speakLang, persona: personaForKind(node.kind), full: true }} />
        <a href={walkingUrl(node)} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium"><Navigation className="size-3.5" /> {t("tour.go")}</a>
        <Link to="/node/$slug" params={{ slug: node.slug }} className="inline-flex h-8 items-center rounded-full border border-border px-3 text-xs font-medium">{t("tour.open")}</Link>
        <button type="button" onClick={onToggle} aria-pressed={done} className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold ${done ? "bg-success text-black" : "bg-secondary"}`}><Check className="size-3.5" /> {done ? t("tour.done") : t("tour.mark")}</button>
      </div>
    </li>
  );
}
