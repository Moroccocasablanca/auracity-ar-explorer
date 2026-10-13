import { useCallback, useEffect, useState } from "react";
import { BookOpen, Brain, Calculator, CheckCircle2, Dices, FlaskConical, Flame, Globe2, Landmark, Languages, MapPin, MessagesSquare, Palette, Scale, Sparkles, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { logEvent } from "@/lib/quest";
import { TOPICS, bandLabel, getBand, loadDailyTrivia, nextTrivia, setBand, shuffled, type Band, type Topic, type Trivia } from "@/lib/trivia";

const TOPIC_ICON: Record<string, LucideIcon> = { mix: Dices, italiano: BookOpen, english: Languages, storia: Landmark, geografia: Globe2, scienze: FlaskConical, mate: Calculator, arte: Palette, civica: Scale, modi: MessagesSquare, locale: MapPin };
const topicIcon = (id: string, cls: string) => {
  const I = TOPIC_ICON[id] ?? Sparkles;
  return <I className={`${cls} shrink-0`} />;
};

/** Quiz for every age and school subject, with the answer and a short explanation shown at once. */
export function TriviaCard() {
  const { t } = useI18n();
  const [band, setBandState] = useState<Band>("adult");
  const [topic, setTopic] = useState<Topic | "mix">("mix");
  const [item, setItem] = useState<Trivia | null>(null);
  const [opts, setOpts] = useState<{ text: string; right: boolean }[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const load = useCallback((b: Band, tp: Topic | "mix") => {
    const q = nextTrivia(b, tp);
    setItem(q);
    setOpts(shuffled(q));
    setPicked(null);
  }, []);
  useEffect(() => {
    const b = getBand();
    setBandState(b);
    load(b, "mix");
    void loadDailyTrivia(); // today's fresh AI questions join the pool for the next ones
  }, [load]);
  if (!item) return null;
  const answer = (i: number) => {
    if (picked != null) return;
    setPicked(i);
    if (opts[i]?.right) {
      setStreak((s) => s + 1);
      logEvent("riddle", `trivia-${item.id}`);
    } else setStreak(0);
  };
  const right = picked != null && opts[picked]?.right;
  const topicInfo = TOPICS.find((x) => x.id === item.topic);
  return (
    <section className="rounded-3xl border-2 border-emerald-300/40 bg-gradient-to-br from-emerald-400/15 to-sky-400/10 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="mono-label flex items-center gap-1.5"><Brain className="size-4" /> {t("trivia.title")}</p>
        {streak > 1 && <span className="rounded-full bg-yellow-300 px-2.5 py-0.5 text-xs font-extrabold text-black"><Flame className="mr-0.5 inline size-3.5" />{streak}</span>}
      </div>
      <div className="mt-3 flex gap-2">
        {(["kids", "teen", "adult"] as Band[]).map((b) => (
          <button key={b} type="button" onClick={() => { setBand(b); setBandState(b); load(b, topic); }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${band === b ? "border-transparent bg-primary text-primary-foreground" : "border-border"}`}>{bandLabel[b]}</button>
        ))}
      </div>
      <div className="chip-row -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {[{ id: "mix" as const, label: t("trivia.mix"), icon: "mix" }, ...TOPICS].map((tp) => (
          <button key={tp.id} type="button" onClick={() => { setTopic(tp.id); load(band, tp.id); }} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${topic === tp.id ? "border-transparent bg-foreground text-background" : "border-border"}`}>{topicIcon(tp.icon, "size-3.5")}{tp.label}</button>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">{topicIcon(topicInfo?.icon ?? "", "size-3.5")}{topicInfo?.label}{item.ai && <span className="ml-1 rounded-full bg-violet-400/25 px-2 py-0.5 text-[0.65rem] text-violet-200">{t("trivia.ai")}</span>}</p>
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
    </section>
  );
}
