import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Gift, Landmark, Sparkles, Star, Store, Volume2, TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { nodesQuery, promo, type NodeRow } from "@/lib/nodes";
import { isGardenObject } from "@/lib/node-rules";
import { isRestaurant } from "@/lib/explore-rules";
import { speakNatural, stopSpeaking } from "@/services/voice/speech";
import { VoicePersona } from "@/services/voice/voice-persona";
import { contentLang } from "@/services/voice/text-speech";
import { moonName, useToday, weatherWord } from "@/lib/live";
import { isOpenNow } from "@/utils/geo";
import { HuntCard } from "@/components/hunt/HuntCard";
import { DutyLine, useClock } from "@/components/DutyCard";
import { TriviaCard } from "@/components/hunt/TriviaCard";
import { getNick, setNick, useLeaderboard } from "@/lib/leaderboard";
import { nodeHours } from "@/lib/nodes";
import { challengesOfDay, countToday, level, logEvent, randomRiddle, rankKey, riddleOfDay, riddleText, stars, uniqueIds, type Riddle } from "@/lib/quest";

export const Route = createFileRoute("/quest")({
  head: () => ({ meta: [{ title: "Adventure — AURACITY" }, { name: "description", content: "Daily missions, riddles and stickers to collect around Bra." }] }),
  component: Quest,
});

const EMPTY = { stars: 0, chars: 0, monuments: 0, stamps: 0, riddles: 0, foundChars: [] as string[], foundMonuments: [] as string[], foundStamps: [] as string[] };

/** Progress lives in localStorage, so it is read after mount (the server render always starts empty). */
function useQuestState() {
  const [state, setState] = useState(EMPTY);
  useEffect(() => {
    const read = () =>
      setState({
        stars: stars(),
        chars: countToday("char"),
        monuments: countToday("monument"),
        stamps: countToday("stamp"),
        riddles: countToday("riddle"),
        foundChars: uniqueIds("char"),
        foundMonuments: uniqueIds("monument"),
        foundStamps: uniqueIds("stamp"),
      });
    read();
    window.addEventListener("aura-quest", read);
    return () => window.removeEventListener("aura-quest", read);
  }, []);
  return state;
}

function RiddleCard({ audience }: { audience: "kids" | "adults" }) {
  const { t, lang } = useI18n();
  const [riddle, setRiddle] = useState<Riddle>(() => riddleOfDay(audience));
  useEffect(() => setRiddle(riddleOfDay(audience)), [audience]);
  const [picked, setPicked] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  const txt = riddleText(riddle, lang);
  useEffect(() => () => stopSpeaking(), []);
  const read = () => {
    if (reading) { stopSpeaking(); setReading(false); return; }
    setReading(true);
    void speakNatural(`${txt.q} ${txt.a.map((a, i) => `${i + 1}. ${a}.`).join(" ")}`, contentLang(lang), () => setReading(false), VoicePersona.HUNT_DYNAMIC);
  };
  const answer = (i: number) => {
    if (picked === riddle.ok) return;
    setPicked(i);
    if (i === riddle.ok) logEvent("riddle", riddle.id);
  };
  const next = () => { setPicked(null); setRiddle(randomRiddle(audience, riddle.id)); };
  const solved = picked === riddle.ok;
  const kids = audience === "kids";
  return (
    <section className={`rounded-3xl border-2 p-5 ${kids ? "border-yellow-300/60 bg-gradient-to-br from-yellow-300/20 to-pink-400/15" : "border-primary/40 bg-primary/10"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="mono-label">{kids ? t("quest.riddle.kids") : t("quest.riddle.adults")}</p>
        <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={read} aria-label={t("audio.listen")}>
          <Volume2 className="size-4" /> {reading ? t("audio.stop") : t("audio.listen")}
        </Button>
      </div>
      <p className="mt-3 text-lg font-semibold leading-snug">{txt.q}</p>
      <div className="mt-4 grid gap-2">
        {txt.a.map((a, i) => {
          const state = picked == null ? "" : i === riddle.ok && solved ? "border-green-400 bg-green-400/20" : picked === i ? "border-red-400 bg-red-400/15" : "";
          return (
            <button key={a} type="button" onClick={() => answer(i)} className={`rounded-2xl border border-border bg-card/70 px-4 py-3 text-left text-base font-medium transition active:scale-[.98] ${state}`}>
              {a}
            </button>
          );
        })}
      </div>
      {picked != null && (
        <p className={`mt-3 flex items-center gap-2 font-semibold ${solved ? "text-green-300" : "text-red-300"}`}>
          {solved ? <><Sparkles className="size-5" /> {t("quest.right")}</> : t("quest.retry")}
        </p>
      )}
      {solved && <Button type="button" className="mt-3 rounded-full" onClick={next}>{t("quest.another")}</Button>}
    </section>
  );
}

function TodayCard() {
  const { t, lang } = useI18n();
  const { data: d, failed } = useToday();
  const { data: nodes = [] } = useQuery(nodesQuery);
  const open = nodes.filter((n) => n.kind === "business" && isOpenNow(nodeHours(n))).length;
  const clock = useClock();
  if (failed) return <p className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">{t("live.fail")}</p>;
  if (!d) return <div className="h-32 animate-pulse rounded-3xl bg-card/60" />;
  return (
    <section className="rounded-3xl border-2 border-sky-300/40 bg-gradient-to-br from-sky-400/15 to-indigo-400/10 p-5">
      <p className="flex items-center justify-between"><span className="mono-label">{t("live.title")}</span><span className="rounded-full bg-black/25 px-3 py-1 font-mono text-sm font-bold">{t("live.clock")} {clock}</span></p>
      <p className="mt-2 text-3xl font-bold">{t("live.now", { t: d.tempNow, w: weatherWord(d.code, lang) })}</p>
      <ul className="mt-3 space-y-1 text-sm text-foreground/90">
        <li>{t("live.range", { a: d.tempMin, b: d.tempMax })} · {t("live.rain", { p: d.rainPct })}</li>
        <li>{t("live.sun", { a: d.sunrise, b: d.sunset })}</li>
        <li>{t("live.moon", { m: moonName(d.moon, lang) })}</li>
        <li>{t("live.open", { n: open })}</li>
      </ul>
      <DutyLine className="mt-3" />
      {d.saints[0] && <p className="mt-3 rounded-2xl bg-yellow-300/15 p-3 text-sm font-semibold">{t("live.auguri", { s: d.saints[0].title, n: [...new Set(d.saints.slice(0, 3).map((x) => x.name))].join(", ") })}</p>}
      {d.saintInfo && <p className="mt-2 text-sm text-foreground/90">{d.saintInfo}</p>}
      {d.event && <p className="mt-3 rounded-2xl bg-black/20 p-3 text-sm"><b>{t("live.event", { y: d.event.year })}</b> {d.event.text}</p>}
    </section>
  );
}

function Challenges() {
  const { t, lang } = useI18n();
  const list = challengesOfDay();
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => setDone(uniqueIds("riddle").filter((id) => id.startsWith("ch-"))), []);
  return (
    <section>
      <h2 className="text-xl font-bold">{t("quest.fun")}</h2>
      <p className="text-sm text-muted-foreground">{t("quest.fun.sub")}</p>
      <ul className="mt-3 space-y-2">
        {list.map((c) => {
          const id = `ch-${c.id}`;
          const ok = done.includes(id);
          return (
            <li key={c.id} className={`flex items-start gap-3 rounded-2xl border p-3 ${ok ? "border-green-400/60 bg-green-400/10" : "border-border bg-card/60"}`}>
              <span className="mono-label mt-1 shrink-0">{c.kids ? t("live.kids") : t("live.adults")}</span>
              <span className="min-w-0 flex-1 text-sm">{lang === "it" ? c.it : c.en}</span>
              <Button type="button" size="sm" variant={ok ? "secondary" : "outline"} className="shrink-0 rounded-full" onClick={() => { logEvent("riddle", id); setDone((d) => (d.includes(id) ? d : [...d, id])); }}>{ok ? "✓" : t("quest.done")}</Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Leaderboard({ points }: { points: number }) {
  const { t } = useI18n();
  const [nick, setNickState] = useState("");
  const [draft, setDraft] = useState("");
  useEffect(() => { const n = getNick(); setNickState(n); setDraft(n); }, []);
  const { rows, shared } = useLeaderboard(points, nick);
  const medalColor = ["#f5c542", "#c0c7d1", "#d58a4a"];
  const medal = (i: number) => (i < 3 ? <span className="mx-auto flex size-7 items-center justify-center rounded-full text-sm font-extrabold text-black shadow" style={{ background: medalColor[i] }}>{i + 1}</span> : `${i + 1}`);
  return (
    <section>
      <h2 className="text-xl font-bold">{t("rank.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("rank.sub")}</p>
      <div className="mt-3 flex gap-2">
        <input value={draft} maxLength={18} onChange={(e) => setDraft(e.target.value)} placeholder={t("rank.nick")} className="min-w-0 flex-1 rounded-xl border border-input bg-secondary/70 px-3 py-2.5 text-sm" />
        <Button type="button" variant="outline" className="rounded-full" onClick={() => { setNick(draft); setNickState(draft.trim().slice(0, 18)); }}>{t("rank.save")}</Button>
      </div>
      <ol className="mt-3 space-y-1.5">
        {rows.slice(0, 10).map((r, i) => (
          <li key={r.nick + i} className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${r.me ? "border-yellow-300 bg-yellow-300/15" : "border-border bg-card/60"}`}>
            <span className="w-7 text-center text-lg font-bold">{medal(i)}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{r.nick}{r.me ? ` · ${t("rank.you")}` : ""}</span>
            <span className="font-mono text-sm">★ {r.points}</span>
          </li>
        ))}
      </ol>
      {!shared && <p className="mt-2 text-xs text-muted-foreground">{t("rank.example")}</p>}
    </section>
  );
}

function Mission({ icon, title, done, goal, now }: { icon: React.ReactNode; title: string; done: boolean; goal: number; now: number }) {
  return (
    <li className={`flex items-center gap-3 rounded-2xl border p-3 ${done ? "border-green-400/60 bg-green-400/10" : "border-border bg-card/60"}`}>
      <span className={`flex size-11 items-center justify-center rounded-full ${done ? "bg-green-400 text-black" : "bg-primary/20 text-primary"}`}>{done ? <Check className="size-6" /> : icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-gradient-to-r from-yellow-300 to-pink-400" style={{ width: `${Math.min(100, (now / goal) * 100)}%` }} /></span>
      </span>
      <span className="font-mono text-sm">{Math.min(now, goal)}/{goal}</span>
    </li>
  );
}

type TabId = "quiz" | "today" | "hunt" | "me";
const TABS: { id: TabId; label: "quest.tab.quiz" | "quest.tab.today" | "quest.tab.hunt" | "quest.tab.me" }[] = [
  { id: "quiz", label: "quest.tab.quiz" },
  { id: "today", label: "quest.tab.today" },
  { id: "hunt", label: "quest.tab.hunt" },
  { id: "me", label: "quest.tab.me" },
];

function Quest() {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<TabId>("quiz");
  useEffect(() => {
    try { const v = localStorage.getItem("aura_quest_tab"); if (v === "quiz" || v === "today" || v === "hunt" || v === "me") setTab(v); } catch { /* ignore */ }
  }, []);
  const pickTab = (id: TabId) => { setTab(id); try { localStorage.setItem("aura_quest_tab", id); } catch { /* ignore */ } };
  const q = useQuestState();
  const { data: nodes = [] } = useQuery(nodesQuery);
  const chars = useMemo(() => nodes.filter(isGardenObject), [nodes]);
  const monuments = useMemo(() => nodes.filter((n) => n.kind === "monument"), [nodes]);
  const venues = useMemo(() => nodes.filter((n) => isRestaurant(n)).filter((n) => q.foundStamps.includes(n.id)), [nodes, q.foundStamps]);
  const lv = level(q.stars);
  const into = q.stars % 10;
  const reward = useCallback((n: NodeRow) => promo(n, lang), [lang]);
  return (
    <div className="grid-backdrop min-h-screen px-4 pb-36 pt-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <p className="mono-label">Bra · {t("quest.kicker")}</p>
          <h1 className="mt-1 text-4xl font-bold">{t("quest.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("quest.sub")}</p>
          <div className="mt-4 flex items-center gap-4 rounded-3xl border border-border bg-card/70 p-4">
            <span className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 text-2xl font-black text-black shadow-lg">{lv}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t("quest.level", { n: lv })} · {t(rankKey(lv))}</p>
              <span className="mt-1 block h-3 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-gradient-to-r from-yellow-300 to-pink-400" style={{ width: `${into * 10}%` }} /></span>
            </div>
            <p className="flex items-center gap-1 font-mono text-lg"><Star className="size-5 fill-yellow-300 text-yellow-300" />{q.stars}</p>
          </div>
        </header>

        {/* One thing at a time: the page is split in four tabs instead of one very long scroll. */}
        <nav className="sticky top-2 z-10 grid grid-cols-4 gap-1 rounded-full border border-border bg-card/95 p-1 shadow-lg" aria-label="sections">
          {TABS.map((x) => (
            <button key={x.id} type="button" onClick={() => pickTab(x.id)} aria-pressed={tab === x.id} className={`rounded-full px-1 py-2 text-xs font-bold ${tab === x.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t(x.label)}</button>
          ))}
        </nav>

        {tab === "quiz" && (
          <>
            <TriviaCard />
            <RiddleCard audience="kids" />
          </>
        )}
        {tab === "today" && (
          <>
            <TodayCard />
            <Challenges />
          </>
        )}
        {tab === "hunt" && <HuntCard />}

        {tab === "hunt" && (
        <section>
          <h2 className="text-xl font-bold">{t("quest.missions")}</h2>
          <ul className="mt-3 space-y-2">
            <Mission icon={<TreePine className="size-6" />} title={t("quest.m.char")} goal={2} now={q.chars} done={q.chars >= 2} />
            <Mission icon={<Landmark className="size-6" />} title={t("quest.m.monument")} goal={1} now={q.monuments} done={q.monuments >= 1} />
            <Mission icon={<Store className="size-6" />} title={t("quest.m.venue")} goal={1} now={q.stamps} done={q.stamps >= 1} />
            <Mission icon={<Sparkles className="size-6" />} title={t("quest.m.riddle")} goal={1} now={q.riddles} done={q.riddles >= 1} />
          </ul>
        </section>
        )}

        {tab === "me" && (
        <>
        <Leaderboard points={q.stars} />

        <section>
          <h2 className="text-xl font-bold">{t("quest.album")}</h2>
          <p className="text-sm text-muted-foreground">{t("quest.album.sub", { a: q.foundChars.filter((id) => chars.some((c) => c.id === id)).length, b: chars.length })}</p>
          <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {chars.map((c) => {
              const got = q.foundChars.includes(c.id);
              return (
                <li key={c.id} className={`aspect-square rounded-2xl border p-2 text-center text-[0.65rem] font-semibold leading-tight ${got ? "border-yellow-300/70 bg-yellow-300/15" : "border-dashed border-border bg-card/40 text-muted-foreground"}`}>
                  <span className={`flex h-2/3 items-center justify-center text-4xl ${got ? "" : "opacity-40 grayscale"}`}>{got ? <img src={c.kind === "tree" ? "/mascots/tree.png" : "/mascots/bench.png"} alt="" className="h-full w-auto object-contain" /> : "?"}</span>
                  <span className="line-clamp-2">{got ? c.name : t("quest.locked")}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">{t("quest.passport")}</h2>
          <p className="text-sm text-muted-foreground">{t("quest.passport.sub")}</p>
          {venues.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">{t("quest.passport.empty")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {venues.map((n) => (
                <li key={n.id} className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3">
                  <Gift className="size-6 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1"><b className="block">{n.name}</b><span className="text-sm text-muted-foreground">{reward(n) || t("quest.stamped")}</span></span>
                </li>
              ))}
            </ul>
          )}
        </section>
        </>
        )}

        <p className="text-center text-sm"><Link to="/explore" className="text-primary underline">{t("quest.back")}</Link></p>
      </div>
    </div>
  );
}
