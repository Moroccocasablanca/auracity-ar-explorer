import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Dumbbell, Globe, MapPin, Navigation, Phone, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { ACTIVITY_META, classesNow, findActivity } from "@/lib/activities";
import { useVenueContent } from "@/lib/venue-content";
import { useFollowing } from "@/lib/follow";
import { directionsUrl, telHref } from "@/lib/services";

export const Route = createFileRoute("/attivita/$id")({
  head: () => ({ meta: [{ title: "Sport e tempo libero — AURACITY" }] }),
  loader: ({ params }) => {
    const a = findActivity(params.id);
    if (!a) throw notFound();
    return a;
  },
  component: ActivityPage,
});

const STATE_STYLE = { live: "border-green-400 bg-green-400/15", soon: "border-yellow-300 bg-yellow-300/15", later: "border-border bg-card/60", done: "border-border bg-card/30 opacity-60" } as const;

function ActivityPage() {
  const a = Route.useLoaderData();
  const { t } = useI18n();
  const meta = ACTIVITY_META[a.type];
  const vc = useVenueContent({ id: a.id } as never);
  const follow = useFollowing(a.id);
  // The classes' live state changes by the minute.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((v) => v + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const classes = classesNow(vc);
  const stateText = (k: (typeof classes)[number]) =>
    k.state === "live" ? `${t("act.live")} · ${t("act.ends", { m: k.minutes })}` : k.state === "soon" ? t("act.soon", { m: k.minutes }) : k.state === "later" ? t("act.later") : t("act.done");

  return (
    <div className="grid-backdrop min-h-screen px-4 pb-32 pt-10">
      <div className="mx-auto max-w-xl space-y-5">
        <Link to="/explore" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> {t("nav.explore")}</Link>
        <header>
          <p className="mono-label" style={{ color: meta.color }}>{t(meta.label)}</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight">{a.name ?? t(meta.label)}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {a.address && <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1"><MapPin className="size-4" />{a.address}</span>}
            {a.hours && <span className="rounded-full border border-border px-3 py-1">{a.hours}</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {a.phone && <Button asChild size="sm" variant="outline" className="rounded-full"><a href={telHref(a.phone)}><Phone className="size-4" /> {t("svc.call")}</a></Button>}
            {a.website && <Button asChild size="sm" variant="outline" className="rounded-full"><a href={a.website} target="_blank" rel="noopener"><Globe className="size-4" /> {t("act.web")}</a></Button>}
            <Button asChild size="sm" variant="outline" className="rounded-full"><a href={directionsUrl(a)} target="_blank" rel="noopener"><Navigation className="size-4" /> {t("svc.directions")}</a></Button>
            <button type="button" onClick={() => void follow.toggle(a.id)} className={`rounded-full border px-4 py-1.5 text-sm font-bold ${follow.following ? "border-green-400 bg-green-400/15 text-green-200" : "border-border"}`}>{follow.following ? `✓ ${t("follow.on")}` : t("follow.off")}</button>
          </div>
        </header>

        {follow.following && follow.opts && (
          <div className="space-y-1.5 rounded-xl border border-border p-3">
            <label className="flex items-center justify-between gap-3 text-sm"><span>{t("follow.nearby")}</span><input type="checkbox" checked={follow.opts.nearby} onChange={(e) => follow.setOpt(a.id, "nearby", e.target.checked)} className="size-5" /></label>
            <label className="flex items-center justify-between gap-3 text-sm"><span>{t("follow.remote")}</span><input type="checkbox" checked={follow.opts.remote} onChange={(e) => follow.setOpt(a.id, "remote", e.target.checked)} className="size-5" /></label>
          </div>
        )}

        {vc.offer && (
          <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-4">
            <Tag className="mt-0.5 size-5 shrink-0" style={{ color: meta.color }} />
            <div><p className="mono-label !text-[0.6rem]" style={{ color: meta.color }}>{t("act.offer")}</p><p className="mt-0.5 font-medium">{vc.offer}</p></div>
          </div>
        )}

        <section>
          <h2 className="flex items-center gap-2 text-lg font-bold"><Dumbbell className="size-5" /> {t("act.classes")}</h2>
          {classes.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">{t("act.classes.none")}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {classes.map((k) => (
                <li key={k.title + k.start} className={`flex items-center gap-3 rounded-2xl border p-3 ${STATE_STYLE[k.state]}`}>
                  <span className="w-24 shrink-0 font-mono text-sm">{k.start}–{k.end}</span>
                  <span className="min-w-0 flex-1 font-semibold leading-snug">{k.title}</span>
                  <span className="shrink-0 text-xs font-semibold">{stateText(k)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{t("act.owner")}</p>
        </section>
      </div>
    </div>
  );
}
