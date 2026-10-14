import { useEffect, useState } from "react";
import { ExternalLink, Moon, Navigation, Phone, Pill, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { directionsUrl, telHref } from "@/lib/services";
import { dutyNow, useDuty, type DutyData, type DutyNow } from "@/lib/duty";

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
                <span className="block font-semibold leading-snug">{d.name}{d.town && !/^bra$/i.test(d.town) ? ` (${d.town})` : ""}</span>
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
            <span className="min-w-0 flex-1 font-semibold">{d.name}{d.town && !/^bra$/i.test(d.town) ? ` (${d.town})` : ""} <span className="font-normal text-muted-foreground">· {d.kind === "night" ? t("duty.night") : t("duty.day")} {d.hours.replace("-", "–")}</span></span>
            {d.place?.phone && <a href={telHref(d.place.phone)} aria-label="call" className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground"><Phone className="size-3.5" />{d.place.phone.replace("+39 ", "")}</a>}
            <a href={d.place ? directionsUrl(d.place) : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Farmacia ${d.name} ${d.town ?? "Bra"}`)}`} target="_blank" rel="noopener" aria-label="directions" className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border"><Navigation className="size-4" /></a>
          </li>
        ))}
      </ul>
    </div>
  );
}
