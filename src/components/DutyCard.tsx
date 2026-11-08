import { useEffect, useState } from "react";
import { CalendarDays, ChevronDown, Megaphone, ExternalLink, Moon, Navigation, Phone, Pill, Sun, Tv } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { directionsUrl, telHref } from "@/lib/services";
import { dutyNow, useDuty, type DutyData, type DutyNow } from "@/lib/duty";
import { useTv } from "@/lib/tv";
import { GROUP_ORDER, groupEvents, prettyDate, useEvents, useNews } from "@/lib/events";
import { useTranslated } from "@/lib/translate";

/** Which pharmacy is on duty now and today (night, weekends, holidays), straight from the official calendar. */
export function DutyCard({ duty, list, full }: { duty: DutyData | null; list: DutyNow[]; full: boolean }) {
  const { t } = useI18n();
  const link = duty && duty.status !== "pending" ? duty.calendar : undefined;
  if (!duty || duty.status === "pending") return full ? <p className="glass mt-3 rounded-2xl p-3 text-sm text-muted-foreground">{t("duty.loading")}</p> : null;
  if (duty.status === "unavailable") return full ? <p className="glass mt-3 rounded-2xl p-3 text-sm">{t("duty.none")} <a className="font-semibold underline" href={link} target="_blank" rel="noopener">{t("duty.calendar")}</a></p> : null;
  const shown = full ? list : list.filter((d) => d.active);
  if (!full && shown.length === 0) return null;
  return (
    <section className="mt-3 rounded-2xl border border-green-600/50 bg-green-600/10 p-3">
      <p className="flex items-center gap-2 text-sm font-bold text-green-400"><span className="inline-block size-2.5 animate-pulse rounded-full bg-green-500" />{t("duty.title")}</p>
      <ul className="mt-2 space-y-2">
        {(shown.length ? shown : list).map((d) => {
          const Icon = d.kind === "night" ? Moon : Sun;
          const q = encodeURIComponent(`Farmacia ${d.name} ${d.town ?? "Bra"}`);
          return (
            <li key={`${d.kind}-${d.name}`} className="flex items-center gap-3 rounded-xl bg-card/70 p-2.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white"><Icon className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.65rem] font-semibold uppercase tracking-wider text-green-400">{t(d.kind === "night" ? "duty.night" : "duty.day")} · {d.hours.replace("-", "–")}{d.active ? ` · ${t("duty.now")}` : ""}</span>
                <span className="block font-semibold leading-snug">{d.town && d.town.toLowerCase() === d.name.toLowerCase() ? `Farmacia di ${d.name}` : d.name}{d.town && !/^bra$/i.test(d.town) && d.town.toLowerCase() !== d.name.toLowerCase() ? ` (${d.town})` : ""}</span>
                {d.place?.address && <span className="block text-sm text-muted-foreground">{d.place.address}</span>}
              </span>
              {d.place?.phone && <a href={telHref(d.place.phone)} aria-label="call" className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"><Phone className="size-4" />{d.place.phone.replace("+39 ", "")}</a>}
              <a href={d.place ? directionsUrl(d.place) : `https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noopener" aria-label="directions" className="flex size-9 items-center justify-center rounded-full border border-border"><Navigation className="size-4" /></a>
            </li>
          );
        })}
      </ul>
      {full && !list.length && <p className="mt-2 text-sm">{t("duty.unsure")}</p>}
      <p className="mt-2 text-[0.7rem] leading-snug text-muted-foreground">{t("duty.note")} <a className="inline-flex items-center gap-0.5 underline" href={link} target="_blank" rel="noopener">{t("duty.calendar")}<ExternalLink className="size-3" /></a></p>
    </section>
  );
}

/** The time of day, kept right by itself. */
export function useClock(): string {
  const fmt = () => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  const [now, setNow] = useState(fmt);
  useEffect(() => { const id = setInterval(() => setNow(fmt()), 15_000); return () => clearInterval(id); }, []);
  return now;
}

/** One compact line for the "today" cards (next to the weather and "on this day"): who is on duty right now. */
export function DutyLine({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const duty = useDuty();
  if (!duty || duty.status === "pending") return null;
  if (duty.status === "unavailable") return <a href={duty.calendar} target="_blank" rel="noopener" className={`flex items-center gap-2 rounded-2xl bg-green-600/15 p-3 text-sm font-semibold ${className}`}><Pill className="size-4 shrink-0 text-green-400" />{t("duty.title")}: {t("duty.calendar")}</a>;
  const list = dutyNow(duty);
  const pick = list.filter((d) => d.active);
  const shown = pick.length ? pick : list.slice(0, 2);
  if (!shown.length) return <a href={duty.calendar} target="_blank" rel="noopener" className={`flex items-center gap-2 rounded-2xl bg-green-600/15 p-3 text-sm font-semibold ${className}`}><Pill className="size-4 shrink-0 text-green-400" />{t("duty.unsure")}</a>;
  return (
    <div className={`rounded-2xl bg-green-600/15 p-3 text-sm ${className}`}>
      <p className="flex items-center gap-2 font-bold text-green-400"><Pill className="size-4 shrink-0" />{t("duty.title")}</p>
      <ul className="mt-1 space-y-1">
        {shown.map((d) => (
          <li key={`${d.kind}-${d.name}`} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 font-semibold">{d.town && d.town.toLowerCase() === d.name.toLowerCase() ? `Farmacia di ${d.name}` : d.name}{d.town && !/^bra$/i.test(d.town) && d.town.toLowerCase() !== d.name.toLowerCase() ? ` (${d.town})` : ""} <span className="font-normal text-muted-foreground">· {d.kind === "night" ? t("duty.night") : t("duty.day")} {d.hours.replace("-", "–")}</span></span>
            {d.place?.phone && <a href={telHref(d.place.phone)} aria-label="call" className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground"><Phone className="size-3.5" />{d.place.phone.replace("+39 ", "")}</a>}
            <a href={d.place ? directionsUrl(d.place) : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Farmacia ${d.name} ${d.town ?? "Bra"}`)}`} target="_blank" rel="noopener" aria-label="directions" className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border"><Navigation className="size-4" /></a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tonight's prime-time TV on the main Italian channels, refreshed by the server every day. Closed by default: one slim row, tap to see the list. */
const CH_COLOR: Record<string, string> = { "Rai 1": "#2f7de1", "Rai 2": "#e8a317", "Rai 3": "#2bb673", "Rete 4": "#d9534f", "Canale 5": "#d4a017", "Italia 1": "#e0457b", "La7": "#c0392b", "TV8": "#16a085", "Nove": "#8e44ad", "20": "#3b82f6", "Rai 4": "#5b6ee1", "Iris": "#b0425d", "Rai Movie": "#7a5c2e", "Cielo": "#0ea5e9", "Real Time": "#e11d74", "La7 Cinema": "#a3392b" };
const chColor = (n: string) => CH_COLOR[n] ?? "#7c5cff";

export function TvLine({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const tv = useTv();
  const [open, setOpen] = useState(false);
  if (!tv) return null;
  if (tv.status !== "ok") return <a href={tv.source} target="_blank" rel="noopener" className={`flex items-center gap-2 rounded-2xl bg-violet-500/15 p-3 text-sm font-semibold ${className}`}><Tv className="size-4 shrink-0 text-violet-300" />{t("tv.title")}: {t("tv.guide")}</a>;
  return (
    <div className={`overflow-hidden rounded-2xl bg-violet-500/15 text-sm ${className}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 p-3 text-left">
        <Tv className="size-4 shrink-0 text-violet-300" />
        <span className="font-bold text-violet-200">{t("tv.title")}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="flex -space-x-1.5">
            {tv.channels.slice(0, 6).map((c) => <span key={c.name} className="size-3.5 rounded-full ring-2 ring-[#1d1b3a]" style={{ background: chColor(c.name) }} />)}
          </span>
          <span className="text-xs text-muted-foreground">{tv.channels.length}</span>
          <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <ul className="max-h-[22rem] divide-y divide-white/5 overflow-y-auto rounded-xl bg-card/70 px-2.5">
            {tv.channels.map((c) => (
              <li key={c.name} className="flex items-start gap-2.5 py-2 leading-snug">
                <span className="mt-0.5 w-[4.6rem] shrink-0 truncate rounded-full px-2 py-0.5 text-center text-[0.65rem] font-bold text-white" style={{ background: chColor(c.name) }}>{c.name}</span>
                <span className="min-w-0 flex-1 space-y-0.5">
                  {c.shows.slice(0, 2).map((sh) => (
                    <span key={sh.hour + sh.title} className="flex items-baseline gap-2">
                      <span className="w-10 shrink-0 font-mono text-xs font-bold text-violet-300">{sh.hour}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold">{sh.title}</span>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <a href={tv.source} target="_blank" rel="noopener" className="mt-1.5 inline-flex items-center gap-0.5 text-[0.7rem] text-muted-foreground underline">{t("tv.guide")}<ExternalLink className="size-3" /></a>
        </div>
      )}
    </div>
  );
}


/** Events of Bra from the official list of the Comune: this weekend, this week, this month, later. Closed by default, tap to see them. */
export function EventsLine({ className = "" }: { className?: string }) {
  const { t, lang } = useI18n();
  const ev = useEvents();
  const [open, setOpen] = useState(false);
  const rows = ev && ev.status === "ok" ? groupEvents(ev.events) : [];
  // the events come from the Comune in Italian: shown in the language you chose
  const evTr = useTranslated(rows.flatMap((r) => [r.event.title, r.event.category]), lang);
  if (!ev) return null;
  if (ev.status !== "ok" || !rows.length) return <a href={ev.source} target="_blank" rel="noopener" className={`flex items-center gap-2 rounded-2xl bg-amber-500/15 p-3 text-sm font-semibold ${className}`}><CalendarDays className="size-4 shrink-0 text-amber-300" />{t("ev.title")}: {t("ev.all")}</a>;
  const soon = rows.filter((r) => r.group === "weekend" || r.group === "week").length;
  return (
    <div className={`overflow-hidden rounded-2xl bg-amber-500/15 text-sm ${className}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 p-3 text-left">
        <CalendarDays className="size-4 shrink-0 text-amber-300" />
        <span className="font-bold text-amber-200">{t("ev.title")}</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          {soon > 0 ? t("ev.soon", { n: soon }) : t("ev.count", { n: rows.length })}
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="space-y-3 px-3 pb-3">
          {GROUP_ORDER.map((g) => {
            const list = rows.filter((r) => r.group === g);
            if (!list.length) return null;
            return (
              <section key={g}>
                <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wider text-amber-300">{t(`ev.${g}`)}</p>
                <ul className="divide-y divide-white/5 rounded-xl bg-card/70 px-2.5">
                  {list.map(({ event: e, next }) => (
                    <li key={e.title}>
                      <a href={e.url} target="_blank" rel="noopener" className="flex items-start gap-2.5 py-2 leading-snug">
                        <span className="mt-0.5 w-[4.2rem] shrink-0 rounded-full bg-amber-500/25 px-2 py-0.5 text-center text-[0.65rem] font-bold text-amber-100">{g === "ongoing" ? t("ev.running") : prettyDate(next, lang === "it" ? "it-IT" : "en-GB")}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{e.big ? "★ " : ""}{evTr[rows.findIndex((r) => r.event === e) * 2] ?? e.title}</span>
                          <span className="block text-xs text-muted-foreground">{evTr[rows.findIndex((r) => r.event === e) * 2 + 1] ?? e.category}{e.dates.filter((d) => d > next).length ? ` · ${t("ev.more", { n: e.dates.filter((d) => d > next).length })}` : ""}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <a href={ev.source} target="_blank" rel="noopener" className="inline-flex items-center gap-0.5 text-[0.7rem] text-muted-foreground underline">{t("ev.all")}<ExternalLink className="size-3" /></a>
        </div>
      )}
    </div>
  );
}


/** News and notices of the Comune (works, closures, services). Urgent ones (works, closures...) are marked and counted. */
export function NewsLine({ className = "" }: { className?: string }) {
  const { t, lang } = useI18n();
  const news = useNews();
  const [open, setOpen] = useState(false);
  // news come from the Comune in Italian: shown in the language you chose
  const list = news?.status === "ok" ? news.items.slice(0, 8) : [];
  const tr = useTranslated(list.flatMap((n) => [n.title, n.summary, n.type]), lang);
  if (!news) return null;
  if (news.status !== "ok" || !news.items.length) return <a href={news.source} target="_blank" rel="noopener" className={`flex items-center gap-2 rounded-2xl bg-sky-500/15 p-3 text-sm font-semibold ${className}`}><Megaphone className="size-4 shrink-0 text-sky-300" />{t("news.title")}: {t("news.all")}</a>;
  const urgent = news.items.filter((n) => n.urgent).length;
  return (
    <div className={`overflow-hidden rounded-2xl bg-sky-500/15 text-sm ${className}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 p-3 text-left">
        <Megaphone className="size-4 shrink-0 text-sky-300" />
        <span className="font-bold text-sky-200">{t("news.title")}</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          {urgent > 0 && <span className="rounded-full bg-red-500/80 px-2 py-0.5 font-bold text-white">{t("news.urgent", { n: urgent })}</span>}
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <ul className="divide-y divide-white/5 rounded-xl bg-card/70 px-2.5">
            {news.items.slice(0, 8).map((n, i) => (
              <li key={n.url}>
                <a href={n.url} target="_blank" rel="noopener" className="block py-2 leading-snug">
                  <span className="block text-[0.65rem] font-semibold uppercase tracking-wider text-sky-300">{n.urgent ? "! " : ""}{prettyDate(n.date, lang === "it" ? "it-IT" : "en-GB")}{n.type ? ` · ${tr[i * 3 + 2] ?? n.type}` : ""}</span>
                  <span className="block font-semibold">{tr[i * 3] ?? n.title}</span>
                  {n.summary && <span className="block text-xs text-muted-foreground">{tr[i * 3 + 1] ?? n.summary}</span>}
                </a>
              </li>
            ))}
          </ul>
          <a href={news.source} target="_blank" rel="noopener" className="mt-1.5 inline-flex items-center gap-0.5 text-[0.7rem] text-muted-foreground underline">{t("news.all")}<ExternalLink className="size-3" /></a>
        </div>
      )}
    </div>
  );
}
