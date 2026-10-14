import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Brain, Calculator, CalendarDays, CheckCircle2, Dices, FlaskConical, Flame, Globe2, Landmark, Languages, MapPin, MessagesSquare, Palette, Scale, Sparkles, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { todayTrivia, useToday } from "@/lib/live";
import { logEvent } from "@/lib/quest";
import { TOPICS, bandLabel, getBand, loadDailyTrivia, loadMoreTrivia, nextTrivia, setBand, setTodayTrivia, shuffled, unseenCount, type Band, type Topic, type Trivia } from "@/lib/trivia";

const TOPIC_ICON: Record<string, LucideIcon> = { mix: Dices, oggi: CalendarDays, italiano: BookOpen, english: Languages, storia: Landmark, geografia: Globe2, scienze: FlaskConical, mate: Calculator, arte: Palette, civica: Scale, modi: MessagesSquare, locale: MapPin };
const topicIcon = (id: string, cls: string) => {
  const I = TOPIC_ICON[id] ?? Sparkles;
  return <I className={`${cls} shrink-0`} />;
};

/** Quiz for every age: the player first chooses the subject (history, languages, English, "on this day"...), then answers; the solution and a short explanation appear at once. */
export function TriviaCard() {
  const { t } = useI18n();
  const { data: today } = useToday();
  const [band, setBandState] = useState<Band>("adult");
  const [topic, setTopic] = useState<Topic | "mix" | null>(null); // null = the subject has not been chosen yet
  const [item, setItem] = useState<Trivia | null>(null);
  const [opts, setOpts] = useState<{ text: string; right: boolean }[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const load = useCallback((b: Band, tp: Topic | "mix") => {
    const q = nextTrivia(b, tp);
    setItem(q);
    setOpts(q ? shuffled(q) : []);
    setPicked(null);
    // Running out of fresh questions on this subject: the AI writes some more in the background.
    if (unseenCount(b, tp) < 4) void loadMoreTrivia(b, tp);
  }, []);
  useEffect(() => {
    setBandState(getBand());
    void loadDailyTrivia(); // today's fresh AI questions join the pool
  }, []);
  useEffect(() => {
    if (today) setTodayTrivia(todayTrivia(today));
  }, [today]);
  // "On this day" waits for the live data; start it as soon as it is there.
  useEffect(() => {
    if (topic === "oggi" && today && !item) load(band, "oggi");
  }, [topic, today, item, band, load]);

  const choose = (tp: Topic | "mix") => {
    setTopic(tp);
    setStreak(0);
    setItem(null);
    if (tp !== "oggi" || today) load(band, tp);
  };

  const answer = (i: number) => {
    if (picked != null || !item) return;
    setPicked(i);
    if (opts[i]?.right) {
      setStreak((s) => s + 1);
      logEvent("riddle", `trivia-${item.id}`);
    } else setStreak(0);
  };
  const right = picked != null && opts[picked]?.right;
  const topicInfo = item ? TOPICS.find((x) => x.id === item.topic) : null;
  const tiles: { id: Topic | "mix"; label: string }[] = [{ id: "mix", label: t("trivia.mix") }, ...TOPICS];

  return (
    <section className="rounded-3xl border-2 border-emerald-300/40 bg-gradient-to-br from-emerald-400/15 to-sky-400/10 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="mono-label flex items-center gap-1.5"><Brain className="size-4" /> {t("trivia.title")}</p>
        {streak > 1 && <span className="rounded-full bg-yellow-300 px-2.5 py-0.5 text-xs font-extrabold text-black"><Flame className="mr-0.5 inline size-3.5" />{streak}</span>}
      </div>
      <div className="mt-3 flex gap-2">
        {(["kids", "teen", "adult"] as Band[]).map((b) => (
          <button key={b} type="button" onClick={() => { setBand(b); setBandState(b); if (topic) { setItem(null); if (topic !== "oggi" || today) load(b, topic); } }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${band === b ? "border-transparent bg-primary text-primary-foreground" : "border-border"}`}>{bandLabel[b]}</button>
        ))}
      </div>

      {topic === null ? (
        <>
          <p className="mt-4 text-lg font-semibold">{t("trivia.choose")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {tiles.map((tp) => (
              <button key={tp.id} type="button" onClick={() => choose(tp.id)} className="flex items-center gap-2.5 rounded-2xl border border-border bg-card/70 px-3 py-3 text-left text-sm font-semibold active:scale-[.97]">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">{topicIcon(tp.id === "mix" ? "mix" : tp.id, "size-5")}</span>
                {tp.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button type="button" onClick={() => { setTopic(null); setItem(null); setPicked(null); }} className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ArrowLeft className="size-3.5" /> {t("trivia.change")}
          </button>
          {!item ? (
            <p className="mt-4 text-sm text-muted-foreground">{topic === "oggi" && !today ? t("trivia.loading") : t("trivia.none")}</p>
          ) : (
            <>
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                {topicIcon(item.topic, "size-3.5")}{topicInfo?.label}
                {item.ai && <span className="ml-1 rounded-full bg-violet-400/25 px-2 py-0.5 text-[0.65rem] text-violet-200">{t("trivia.ai")}</span>}
              </p>
              <p className="mt-1 text-lg font-semibold leading-snug">{item.q}</p>
              <div className="mt-4 grid gap-2">
                {opts.map((o, i) => {
                  const state = picked == null ? "" : o.right ? "border-green-400 bg-green-400/20" : picked === i ? "border-red-400 bg-red-400/15" : "opacity-60";
                  return <button key={o.text} type="button" onClick={() => answer(i)} className={`rounded-2xl border border-border bg-card/70 px-4 py-3 text-left text-base font-medium active:scale-[.98] ${state}`}>{o.text}</button>;
                })}
              </div>
              {picked != null && (
                <div className={`mt-3 rounded-2xl p-3 text-sm ${right ? "bg-green-400/15" : "bg-red-400/10"}`}>
                  <p className="flex items-center gap-1.5 font-bold">{right ? <><CheckCircle2 className="size-5 text-green-400" /> {t("quest.right")}</> : <><XCircle className="size-5 text-red-400" /> {t("trivia.wrong")}</>}</p>
                  <p className="mt-1">{!right && <b>{opts.find((o) => o.right)?.text}. </b>}{item.why}</p>
                  <Button type="button" className="mt-3 rounded-full" onClick={() => load(band, topic)}>{t("trivia.next")}</Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
