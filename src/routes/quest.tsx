import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Gift, Landmark, Sparkles, Star, Store, Volume2, TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { nodesQuery, promo, type NodeRow } from "@/lib/nodes";
import { isGardenObject } from "@/lib/node-rules";
import { isRestaurant } from "@/lib/explore-rules";
import { speakNatural, stopSpeaking } from "@/lib/speech";
import { VoicePersona } from "@/lib/voice-persona";
import { warmNeuralVoice } from "@/lib/neuralVoice";
import { contentLang } from "@/lib/text-speech";
import { buildLiveQuestions, moonName, useToday, weatherWord, type LiveQuestion } from "@/lib/live";
import { isOpenNow } from "@/lib/geo";
import { TOPICS, bandLabel, getBand, nextTrivia, setBand, shuffled, type Band, type Topic, type Trivia } from "@/lib/trivia";
import { getNick, setNick, useLeaderboard } from "@/lib/leaderboard";
import { romeDate } from "@/lib/geo";
import { AVATAR_EMOJI, buildHunt, huntDone, markHuntDone, rewardName, weekKey } from "@/lib/hunt";
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

function HuntCard() {
  const { t, lang } = useI18n();
  const { data: nodes = [] } = useQuery(nodesQuery);
  const items = useMemo(() => buildHunt(nodes), [nodes]);
  const [done, setDone] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  useEffect(() => setDone(huntDone()), []);
  if (!items.length) return null;
  const found = items.filter((h) => done.includes(h.elementId)).length;
  const pick = (h: (typeof items)[number], id: string) => {
    if (id === h.nodeId) { markHuntDone(h.elementId); logEvent("riddle", h.elementId); setDone(huntDone()); setWrong(null); } else setWrong(h.elementId);
  };
  const listen = (h: (typeof items)[number]) => { stopSpeaking(); void speakNatural(lang === "it" ? h.riddle.it : h.riddle.en, contentLang(lang), undefined, VoicePersona.HUNT_DYNAMIC); };
  return (
    <section className="rounded-3xl border-2 border-fuchsia-300/50 bg-gradient-to-br from-fuchsia-400/15 to-amber-300/10 p-5">
      <p className="mono-label">🗺️ {t("treasure.title")} · {weekKey()}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("treasure.sub", { n: found, m: items.length })}</p>
      <div className="mt-3 space-y-3">
        {items.map((h) => {
          const ok = done.includes(h.elementId);
          return (
            <div key={h.elementId} className="rounded-2xl border border-border bg-card/70 p-3">
              <div className="flex items-start gap-3">
                <span className="text-4xl">{AVATAR_EMOJI[h.currentAvatarType]}</span>
                <p className="flex-1 text-sm font-semibold leading-snug">{lang === "it" ? h.riddle.it : h.riddle.en}</p>
                <button type="button" aria-label={t("audio.listen")} onClick={() => listen(h)}><Volume2 className="size-5" /></button>
              </div>
              {ok ? (
                <p className="mt-2 text-sm font-bold text-green-300">🎉 {t("treasure.reward", { r: rewardName(h, lang) })}</p>
              ) : (
                <div className="mt-2 grid gap-2">
                  {h.options.map((o) => <button key={o.id} type="button" onClick={() => pick(h, o.id)} className="rounded-xl border border-border px-3 py-2 text-left text-sm active:scale-[.98]">{o.name}</button>)}
                  {wrong === h.elementId && <p className="text-sm text-red-300">{t("quest.retry")}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t("treasure.note")}</p>
    </section>
  );
}

function RiddleCard({ audience }: { audience: "kids" | "adults" }) {
  const { t, lang } = useI18n();
  const [riddle, setRiddle] = useState<Riddle>(() => riddleOfDay(audience));
  useEffect(() => setRiddle(riddleOfDay(audience)), [audience]);
  const [picked, setPicked] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  const txt = riddleText(riddle, lang);
  useEffect(() => { warmNeuralVoice(contentLang(lang)); return () => stopSpeaking(); }, [lang]);
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
  if (failed) return <p className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">{t("live.fail")}</p>;
  if (!d) return <div className="h-32 animate-pulse rounded-3xl bg-card/60" />;
  return (
    <section className="rounded-3xl border-2 border-sky-300/40 bg-gradient-to-br from-sky-400/15 to-indigo-400/10 p-5">
      <p className="mono-label">{t("live.title")}</p>
      <p className="mt-2 text-3xl font-bold">{t("live.now", { t: d.tempNow, w: weatherWord(d.code, lang) })}</p>
      <ul className="mt-3 space-y-1 text-sm text-foreground/90">
        <li>{t("live.range", { a: d.tempMin, b: d.tempMax })} · {t("live.rain", { p: d.rainPct })}</li>
        <li>{t("live.sun", { a: d.sunrise, b: d.sunset })}</li>
        <li>{t("live.moon", { m: moonName(d.moon, lang) })}</li>
        <li>{t("live.open", { n: open })}</li>
      </ul>
      {d.saints[0] && <p className="mt-3 rounded-2xl bg-yellow-300/15 p-3 text-sm font-semibold">{t("live.auguri", { s: d.saints[0].title, n: [...new Set(d.saints.slice(0, 3).map((x) => x.name))].join(", ") })}</p>}
      {d.saintInfo && <p className="mt-2 text-sm text-foreground/90">{d.saintInfo}</p>}
      {d.event && <p className="mt-3 rounded-2xl bg-black/20 p-3 text-sm"><b>{t("live.event", { y: d.event.year })}</b> {d.event.text}</p>}
    </section>
  );
}

function LiveQuizCard({ q }: { q: LiveQuestion }) {
  const { t, lang } = useI18n();
  const [picked, setPicked] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  const solved = picked === q.ok;
  useEffect(() => () => stopSpeaking(), []);
  const read = () => {
    if (reading) { stopSpeaking(); setReading(false); return; }
    setReading(true);
    void speakNatural(`${q.q} ${q.options.map((o, i) => `${i + 1}. ${o}.`).join(" ")}`, contentLang(lang), () => setReading(false), VoicePersona.HUNT_DYNAMIC);
  };
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="mono-label">{q.kids ? t("live.kids") : t("live.adults")}</span>
        <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={read}><Volume2 className="size-4" /> {reading ? t("audio.stop") : t("audio.listen")}</Button>
      </div>
      <p className="mt-2 font-semibold leading-snug">{q.q}</p>
      <div className="mt-3 grid gap-2">
        {q.options.map((o, i) => (
          <button
            key={o}
            type="button"
            onClick={() => { if (solved) return; setPicked(i); if (i === q.ok) logEvent("riddle", q.id); }}
            className={`rounded-xl border px-3 py-2.5 text-left font-medium ${picked == null ? "border-border" : i === q.ok && solved ? "border-green-400 bg-green-400/20" : picked === i ? "border-red-400 bg-red-400/15" : "border-border"}`}
          >{o}</button>
        ))}
      </div>
      {picked != null && <p className={`mt-2 text-sm font-semibold ${solved ? "text-green-300" : "text-red-300"}`}>{solved ? t("quest.right") : t("quest.retry")}</p>}
    </div>
  );
}

function LiveQuiz() {
  const { t, lang } = useI18n();
  const { data: d } = useToday();
  if (!d) return null;
  const qs = buildLiveQuestions(d, lang);
  return (
    <section>
      <h2 className="text-xl font-bold">{t("live.quiz")}</h2>
      <p className="text-sm text-muted-foreground">{t("live.quiz.sub")}</p>
      <div className="mt-3 space-y-3">{qs.map((q) => <LiveQuizCard key={q.id} q={q} />)}</div>
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

function TriviaCard() {
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
        <p className="mono-label">🧠 {t("trivia.title")}</p>
        {streak > 1 && <span className="rounded-full bg-yellow-300 px-2.5 py-0.5 text-xs font-extrabold text-black">🔥 {streak}</span>}
      </div>
      <div className="mt-3 flex gap-2">
        {(["kids", "teen", "adult"] as Band[]).map((b) => (
          <button key={b} type="button" onClick={() => { setBand(b); setBandState(b); load(b, topic); }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${band === b ? "border-transparent bg-primary text-primary-foreground" : "border-border"}`}>{bandLabel[b]}</button>
        ))}
      </div>
      <div className="chip-row -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {[{ id: "mix" as const, label: t("trivia.mix"), icon: "🎲" }, ...TOPICS].map((tp) => (
          <button key={tp.id} type="button" onClick={() => { setTopic(tp.id); load(band, tp.id); }} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${topic === tp.id ? "border-transparent bg-foreground text-background" : "border-border"}`}>{tp.icon} {tp.label}</button>
        ))}
      </div>
      <p className="mt-4 text-xs font-semibold text-muted-foreground">{topicInfo?.icon} {topicInfo?.label}</p>
      <p className="mt-1 text-lg font-semibold leading-snug">{item.q}</p>
      <div className="mt-4 grid gap-2">
        {opts.map((o, i) => {
          const state = picked == null ? "" : o.right ? "border-green-400 bg-green-400/20" : picked === i ? "border-red-400 bg-red-400/15" : "opacity-60";
          return <button key={o.text} type="button" onClick={() => answer(i)} className={`rounded-2xl border border-border bg-card/70 px-4 py-3 text-left text-base font-medium active:scale-[.98] ${state}`}>{o.text}</button>;
        })}
      </div>
      {picked != null && (
        <div className={`mt-3 rounded-2xl p-3 text-sm ${right ? "bg-green-400/15" : "bg-red-400/10"}`}>
          <p className="font-bold">{right ? `✅ ${t("quest.right")}` : `❌ ${t("trivia.wrong")}`}</p>
          <p className="mt-1">{!right && <b>{opts.find((o) => o.right)?.text}. </b>}{item.why}</p>
          <Button type="button" className="mt-3 rounded-full" onClick={() => load(band, topic)}>{t("trivia.next")}</Button>
        </div>
      )}
    </section>
  );
}

function Leaderboard({ points }: { points: number }) {
  const { t } = useI18n();
  const [nick, setNickState] = useState("");
  const [draft, setDraft] = useState("");
  useEffect(() => { const n = getNick(); setNickState(n); setDraft(n); }, []);
  const { rows, shared } = useLeaderboard(points, nick);
  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`);
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

function Quest() {
  const { t, lang } = useI18n();
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

        <TodayCard />
        <LiveQuiz />
        <TriviaCard />
        <Challenges />
        <HuntCard />
        <RiddleCard audience="kids" />

        <section>
          <h2 className="text-xl font-bold">{t("quest.missions")}</h2>
          <ul className="mt-3 space-y-2">
            <Mission icon={<TreePine className="size-6" />} title={t("quest.m.char")} goal={2} now={q.chars} done={q.chars >= 2} />
            <Mission icon={<Landmark className="size-6" />} title={t("quest.m.monument")} goal={1} now={q.monuments} done={q.monuments >= 1} />
            <Mission icon={<Store className="size-6" />} title={t("quest.m.venue")} goal={1} now={q.stamps} done={q.stamps >= 1} />
            <Mission icon={<Sparkles className="size-6" />} title={t("quest.m.riddle")} goal={1} now={q.riddles} done={q.riddles >= 1} />
          </ul>
        </section>

        <Leaderboard points={q.stars} />

        <section>
          <h2 className="text-xl font-bold">{t("quest.album")}</h2>
          <p className="text-sm text-muted-foreground">{t("quest.album.sub", { a: q.foundChars.filter((id) => chars.some((c) => c.id === id)).length, b: chars.length })}</p>
          <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {chars.map((c) => {
              const got = q.foundChars.includes(c.id);
              return (
                <li key={c.id} className={`aspect-square rounded-2xl border p-2 text-center text-[0.65rem] font-semibold leading-tight ${got ? "border-yellow-300/70 bg-yellow-300/15" : "border-dashed border-border bg-card/40 text-muted-foreground"}`}>
                  <span className={`flex h-2/3 items-center justify-center text-4xl ${got ? "" : "opacity-40 grayscale"}`}>{got ? (c.kind === "tree" ? "🌳" : "🪑") : "?"}</span>
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

        <p className="text-center text-sm"><Link to="/explore" className="text-primary underline">{t("quest.back")}</Link></p>
      </div>
    </div>
  );
}
