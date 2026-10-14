import { ExternalLink, Moon, Navigation, Phone, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { directionsUrl, telHref } from "@/lib/services";
import type { DutyData, DutyNow } from "@/lib/duty";

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
                <span className="block text-[0.65rem] font-semibold uppercase tracking-wider text-green-400">{t(d.kind === "night" ? "duty.night" : "duty.day")} · {d.hours}{d.active ? ` · ${t("duty.now")}` : ""}</span>
                <span className="block font-semibold leading-snug">{d.name}{d.town && !/^bra$/i.test(d.town) ? ` (${d.town})` : ""}</span>
                {d.place?.address && <span className="block text-sm text-muted-foreground">{d.place.address}</span>}
              </span>
              {d.place?.phone && <a href={telHref(d.place.phone)} aria-label="call" className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground"><Phone className="size-4" /></a>}
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
