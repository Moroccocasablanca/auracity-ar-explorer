// Quick answers of the Bra guide, built from the app's own data and your position: works without any AI service.
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Landmark, MapPin, Navigation, Phone, TreePine, Utensils, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useLocation, BRA_CENTER } from "@/lib/location";
import { distanceM, formatDistance, isOpenNow } from "@/utils/geo";
import { nodeHours, nodesQuery, shortStory, history, description, type NodeRow } from "@/lib/nodes";
import { isRestaurant } from "@/lib/explore-rules";
import { isGardenObject } from "@/lib/node-rules";
import { placeStyle } from "@/lib/place-style";
import { inviteBody } from "@/services/notifications/invites";
import { directionsUrl, SERVICES, SERVICE_META, telHref, type ServiceType } from "@/lib/services";
import { speakAny } from "@/services/voice/speech";
import { VoicePersona } from "@/services/voice/voice-persona";
import { contentLang, nameThenText } from "@/services/voice/text-speech";
import { useToday, weatherWord } from "@/lib/live";
import { ACTIVITIES, ACTIVITY_META, classesNow } from "@/lib/activities";
import { getVenueContent } from "@/lib/venue-content";
import { DutyLine, useClock } from "@/components/DutyCard";
import { buildTour } from "@/lib/tour";
import { Footprints } from "lucide-react";

const card = "rounded-2xl border border-border bg-card/60 p-4";

export function QuickGuide() {
  const { t, lang } = useI18n();
  const { pos, active, start } = useLocation();
  const here = pos ?? BRA_CENTER;
  const { data: nodes = [] } = useQuery(nodesQuery);
  const { data: today } = useToday();
  const clock = useClock();

  const withDist = (list: NodeRow[]) => list.map((n) => ({ n, d: distanceM(here, n) })).sort((a, b) => a.d - b.d);
  const eat = useMemo(() => withDist(nodes.filter((n) => (isRestaurant(n) || ["cafe", "ice_cream", "fast_food", "bar", "pub"].includes(n.venue_type ?? "")) && isOpenNow(nodeHours(n)))).slice(0, 5), [nodes, here.lat, here.lng]);
  const see = useMemo(() => withDist(nodes.filter((n) => n.kind === "monument")).slice(0, 4), [nodes, here.lat, here.lng]);
  const talk = useMemo(() => withDist(nodes.filter(isGardenObject)).slice(0, 3), [nodes, here.lat, here.lng]);
  const useful = useMemo(() => {
    const types: ServiceType[] = ["pharmacy", "hospital", "carabinieri", "police"];
    return types
      .map((ty) => SERVICES.filter((s) => s.type === ty).map((s) => ({ s, d: distanceM(here, s) })).sort((a, b) => a.d - b.d)[0])
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [here.lat, here.lng]);

  // Classes running now or starting within the hour, from the gyms that published them.
  const nowClasses = useMemo(
    () =>
      ACTIVITIES.flatMap((a) => classesNow(getVenueContent(a.id)).filter((k) => k.state === "live" || k.state === "soon").map((k) => ({ a, k, d: distanceM(here, a) })))
        .sort((x, y) => (x.k.state === y.k.state ? x.d - y.d : x.k.state === "live" ? -1 : 1))
        .slice(0, 6),
    [here.lat, here.lng],
  );

  const say = (n: NodeRow, body: string) => void speakAny(nameThenText(n.name, body, contentLang(lang)), contentLang(lang), undefined, VoicePersona.MONUMENT_FEMALE);

  return (
    <div className="space-y-5 pb-4">
      {!pos && (
        <button type="button" onClick={() => void start()} className="flex w-full items-center gap-3 rounded-2xl border border-primary/50 bg-primary/10 px-4 py-3 text-left text-sm">
          <MapPin className="size-5 text-primary" />
          <span className="flex-1">{active ? t("guide.q.nogps") : t("guide.q.locate")}</span>
        </button>
      )}

      <TourCard />

      {today && (
        <div className={card}>
          <p className="flex items-center justify-between"><span className="mono-label">{t("live.title")}</span><span className="font-mono text-sm font-bold">{t("live.clock")} {clock}</span></p>
          <p className="mt-1 text-lg font-semibold">{t("live.now", { t: today.tempNow, w: weatherWord(today.code, lang) })}</p>
          <p className="text-sm text-muted-foreground">{t("live.sun", { a: today.sunrise, b: today.sunset })}</p>
          <DutyLine className="mt-3" />
        </div>
      )}

      {nowClasses.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">🏃 {t("act.now")}</h2>
          <ul className="mt-2 space-y-2">
            {nowClasses.map(({ a, k, d }) => (
              <li key={a.id + k.start}>
                <Link to="/attivita/$id" params={{ id: a.id }} className={`block ${card}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold leading-snug">{k.title} · {a.name}</p>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatDistance(d)}</span>
                  </div>
                  <p className="mt-1 text-sm" style={{ color: ACTIVITY_META[a.type].color }}>{k.start}–{k.end} · {k.state === "live" ? t("act.live") : t("act.soon", { m: k.minutes })}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold"><Utensils className="size-5" /> {t("guide.q.eat")}</h2>
        <ul className="mt-2 space-y-2">
          {eat.map(({ n, d }) => (
            <li key={n.id} className={card}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="mono-label !text-[0.6rem]" style={{ color: placeStyle(n).color }}>{t(placeStyle(n).label)}</p>
                  <p className="font-semibold leading-snug">{n.name}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatDistance(d)}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{inviteBody(n, lang, t("prox.invite.default"))}</p>
              <div className="mt-2 flex gap-2">
                <Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/node/$slug" params={{ slug: n.slug }}>{t("prox.open")}</Link></Button>
                <Button asChild size="sm" variant="outline" className="rounded-full"><a href={directionsUrl(n)} target="_blank" rel="noopener"><Navigation className="size-4" /> {t("svc.directions")}</a></Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold"><Landmark className="size-5" /> {t("guide.q.see")}</h2>
        <ul className="mt-2 space-y-2">
          {see.map(({ n, d }) => {
            const body = shortStory(history(n, lang) || description(n, lang));
            return (
              <li key={n.id} className={card}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold leading-snug">{n.name}</p>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatDistance(d)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => say(n, body)}><Volume2 className="size-4" /> {t("audio.listen")}</Button>
                  <Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/node/$slug" params={{ slug: n.slug }}>{t("prox.open")}</Link></Button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold"><TreePine className="size-5" /> {t("guide.q.talk")}</h2>
        <ul className="mt-2 space-y-2">
          {talk.map(({ n, d }) => (
            <li key={n.id} className={`${card} flex items-center justify-between gap-3`}>
              <Link to="/node/$slug" params={{ slug: n.slug }} className="min-w-0 font-semibold leading-snug">{n.name}</Link>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatDistance(d)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold"><Phone className="size-5" /> {t("guide.q.useful")}</h2>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {[
            { n: "112", label: t("sos.112"), tone: "bg-red-600 text-white" },
            { n: "116117", label: t("sos.116117"), tone: "bg-primary text-primary-foreground" },
            { n: "114", label: t("sos.114"), tone: "bg-primary text-primary-foreground" },
            { n: "1522", label: t("sos.1522"), tone: "bg-primary text-primary-foreground" },
            { n: "0172438111", label: t("sos.comune"), tone: "border border-border" },
          ].map((x) => (
            <li key={x.n}>
              <a href={`tel:${x.n}`} className={`flex h-full items-center gap-2 rounded-2xl px-3 py-2.5 ${x.tone}`}>
                <Phone className="size-4 shrink-0" />
                <span className="min-w-0 leading-tight"><span className="block text-sm font-bold">{x.n === "0172438111" ? "0172 438111" : x.n}</span><span className="block truncate text-[0.65rem] opacity-90">{x.label}</span></span>
              </a>
            </li>
          ))}
        </ul>
        <ul className="mt-2 space-y-2">
          {useful.map(({ s, d }) => (
            <li key={s.id} className={`${card} flex items-center gap-3`}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2" style={{ background: SERVICE_META[s.type].bg, borderColor: SERVICE_META[s.type].color, color: SERVICE_META[s.type].fg }}>
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: SERVICE_META[s.type].symbol }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: SERVICE_META[s.type].color }}>{t(SERVICE_META[s.type].label)}</span>
                <span className="block font-semibold leading-snug">{s.name ?? t(SERVICE_META[s.type].label)}</span>
                <span className="block font-mono text-xs text-muted-foreground">{formatDistance(d)}</span>
              </span>
              {s.phone && <a href={telHref(s.phone)} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">{t("svc.call")}</a>}
              <a href={directionsUrl(s)} target="_blank" rel="noopener" className="rounded-full border border-border px-3 py-1.5 text-xs font-bold">➤</a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Entry to the guided walk: how many monuments and how long, from where you are. */
function TourCard() {
  const { t } = useI18n();
  const { pos } = useLocation();
  const { data: nodes = [] } = useQuery(nodesQuery);
  const tour = useMemo(() => buildTour(nodes.filter((n) => n.kind === "monument"), pos ?? BRA_CENTER), [nodes, pos]);
  if (!tour.stops.length) return null;
  return (
    <Link to="/tour" className="flex items-center gap-3 rounded-2xl border border-primary/60 bg-primary/15 px-4 py-4 transition active:scale-[.98]">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Footprints className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{t("tour.card")}</span>
        <span className="block text-sm text-muted-foreground">{t("tour.card.sub", { n: tour.stops.length, min: tour.minutes })}</span>
      </span>
      <span aria-hidden className="text-xl">›</span>
    </Link>
  );
}
