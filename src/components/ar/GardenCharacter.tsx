import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Armchair, TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { description, history, messagesQuery, type NodeRow } from "@/lib/nodes";
import { useNodeText } from "@/services/translate/use-node-text";
import { markDiscovered } from "@/lib/discovered";
import { DEMO_MESSAGES } from "@/lib/jokes";
import { detectTextLang, greetingWithName, nameThenText } from "@/services/voice/text-speech";
import { useLocalMessages } from "@/lib/local-messages";
import { canUseTestAdmin } from "@/config/systemConfig";
import { narrate, speakAny, speakNatural, speakOrBackup, stopSpeaking } from "@/services/voice/speech";
import { chatterFor } from "@/lib/daily-chatter";
import { messageIn, nodeTextIn } from "@/lib/localize";
import { useTranslated } from "@/lib/translate";
import { DictateButton } from "@/components/VoiceInputButton";
import { nodesQuery } from "@/lib/nodes";
import { VoicePersona } from "@/services/voice/voice-persona";

export function GardenFace({ kind, speaking, size = 88 }: { kind: string; speaking: boolean; size?: number }) {
  const Icon = kind === "bench" ? Armchair : TreePine;
  return (
    <div style={{ width: size, height: size * 1.14, flex: `0 0 ${size}px` }} aria-hidden="true">
      <div style={{ transform: `scale(${size / 88})`, transformOrigin: "top left" }}>
        <div className={`garden-character ${speaking ? "is-speaking" : ""}`}>
          <Icon className="absolute inset-0 size-full text-kind-tree" />
          <div className="garden-face"><span className="garden-eye" /><span className="garden-eye" /><span className="garden-mouth" /></div>
        </div>
      </div>
    </div>
  );
}

const timeFmt = (iso: string, lang: string) =>
  new Date(iso).toLocaleString(lang === "it" ? "it-IT" : "en-GB", { timeZone: "Europe/Rome", weekday: "short", hour: "2-digit", minute: "2-digit" });

/** Garden object that wakes up when you arrive and reads what people left for the next person sitting here
 *  (adults and kids alike): up to 10 recent messages, newest first, each with its time. */
export function GardenCharacter({ node, inRange }: { node: NodeRow; inRange: boolean }) {
  const { t, lang } = useI18n();
  const { data: messages = [], isPending, isError } = useQuery(messagesQuery(node.id));
  const { data: allNodes = [] } = useQuery(nodesQuery);
  const [reading, setReading] = useState<string | null>(null);
  const woke = useRef(false);
  const run = useRef(0);
  const tx = useNodeText(node);
  // Test mode only: sample messages so the owner can preview a busy bench.
  const demo =
    typeof window !== "undefined" && canUseTestAdmin(window.location.hostname, import.meta.env.DEV) && localStorage.getItem("aura_demo_msgs") === "1";
  const sample = demo ? DEMO_MESSAGES.map((m, i) => ({ id: `demo-${i}`, body: lang === "it" ? m.it : m.en, created_at: new Date(Date.now() - (i + 1) * 47 * 60_000).toISOString() })) : [];
  const mine = useLocalMessages(node.id).map((m) => ({ id: m.id, body: m.body, created_at: m.created_at }));
  const feed = [...mine, ...sample, ...messages].slice(0, 10);
  const latest = feed[0];
  // "Ask me something": the child asks a question by voice or typing, the tree or bench answers in its own funny way (in the language you chose).
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);
  const ask = async () => {
    const q = question.trim();
    if (q.length < 2 || asking) return;
    setAsking(true);
    try {
      const r = await fetch("/api/character-chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: node.kind, name: node.name, question: q, lang, history: chat.slice(-3) }) });
      const j = (await r.json()) as { answer?: string };
      if (!r.ok || !j.answer) throw new Error("busy");
      setChat((c) => [...c.slice(-3), { q, a: j.answer! }]);
      setQuestion("");
      stopSpeaking();
      setReading("answer");
      void speakNatural(j.answer, lang, () => setReading((x) => (x === "answer" ? null : x)), VoicePersona.HUNT_DYNAMIC);
    } catch {
      toast.error(t("garden.ask.error"));
    } finally {
      setAsking(false);
    }
  };
  const shown = useTranslated(feed.map((m) => m.body), lang); // the messages are shown in the language you chose

  useEffect(() => () => stopSpeaking(), []);

  // Messages are read in the language you chose (visitors write in any language).
  const readOne = (m: { id: string; body: string }) => {
    run.current++;
    setReading(m.id);
    void messageIn(m.body, lang).then((s) => speakNatural(s.text, s.text === m.body ? detectTextLang(m.body, lang) : s.lang, () => setReading((r) => (r === m.id ? null : r)), VoicePersona.HUNT_DYNAMIC));
  };
  const readAll = () => {
    const my = ++run.current;
    const step = (i: number) => {
      if (my !== run.current || i >= feed.length) return setReading(null);
      const msg = feed[i]!;
      setReading(msg.id);
      void messageIn(msg.body, lang).then((s) => {
        if (my !== run.current) return;
        void speakNatural(s.text, s.text === msg.body ? detectTextLang(msg.body, lang) : s.lang, () => setTimeout(() => step(i + 1), 500), VoicePersona.HUNT_DYNAMIC);
      });
    };
    step(0);
  };
  const invite = () => {
    run.current++;
    setReading("invite");
    // Its own story with the recorded young voice (instant); the written greeting only if the place has no story yet. All in the language you chose.
    void nodeTextIn(node, "story", lang).then((st) => {
      const recorded = () => { if (st.text) void narrate({ nodeId: node.id, source: "history", persona: VoicePersona.HUNT_DYNAMIC, lang: st.lang }, nameThenText(node.name, st.text, st.lang), st.lang, () => setReading(null)); else setReading(null); };
      // Every day a new greeting and a new riddle / joke / curiosity; the recorded story is the backup if the voice is not available.
      void chatterFor(node, allNodes, lang).then(async (today) => {
        // Today's new line always wins (the free voice prepares it in a moment if it is not ready); the old recording only if no voice works at all.
        if (today) speakOrBackup(today.text, today.lang, recorded, () => setReading(null), VoicePersona.HUNT_DYNAMIC);
        else if (st.text) recorded();
        else void speakAny(greetingWithName(t("garden.hello", { name: "§" }), node.name, lang, t("garden.empty")), lang, () => setReading(null), VoicePersona.HUNT_DYNAMIC);
      });
    });
  };
  const stop = () => {
    run.current++;
    stopSpeaking();
    setReading(null);
  };

  useEffect(() => {
    if (!inRange || isPending || isError || woke.current) return;
    woke.current = true;
    markDiscovered(node.id);
    if (latest) readOne(latest);
    else invite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRange, isPending, isError, latest?.id]);

  return (
    <div className="space-y-4 border-y border-border py-5">
      <div className="flex flex-wrap items-center gap-5">
        <GardenFace kind={node.kind} speaking={reading != null} />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="mono-label !text-[0.6rem]">{feed.length > 0 ? t("garden.today", { n: feed.length }) : t("garden.latest")}{demo ? " · TEST" : ""}</p>
          {feed.length === 0 && <p className="text-sm text-foreground">{t("garden.empty")}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => (reading ? stop() : feed.length > 1 ? readAll() : latest ? readOne(latest) : invite())}>
              {reading ? t("audio.stop") : feed.length > 1 ? t("garden.readall", { n: feed.length }) : t("garden.talk")}
            </Button>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
        <p className="text-sm font-bold">{t("garden.ask.title")}</p>
        <div className="mt-2 flex items-center gap-2">
          <input value={question} onChange={(e) => setQuestion(e.target.value.slice(0, 300))} onKeyDown={(e) => e.key === "Enter" && void ask()} placeholder={t("garden.ask.ph")} aria-label={t("garden.ask.ph")} className="h-11 min-w-0 flex-1 rounded-full border border-input bg-background/70 px-4 text-base outline-none placeholder:text-muted-foreground focus:border-primary" />
          <DictateButton value={question} setValue={(v) => setQuestion(v.slice(0, 300))} />
          <button type="button" onClick={() => void ask()} disabled={asking || question.trim().length < 2} className="h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{asking ? "…" : t("garden.ask.go")}</button>
        </div>
        {chat.length > 0 && (
          <div className="mt-3 space-y-2">
            {chat.slice(-2).map((c, i) => (
              <div key={i} className="space-y-1">
                <p className="text-xs text-muted-foreground">{c.q}</p>
                <p className="rounded-xl bg-card/70 p-2.5 text-sm leading-snug">{c.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {feed.length > 0 && (
        <ul className="space-y-2">
          {feed.map((m, i) => (
            <li key={m.id} className={`rounded-2xl border p-3 ${reading === m.id ? "border-primary bg-primary/10" : "border-border bg-card/50"}`}>
              <button type="button" className="block w-full text-left" onClick={() => (reading === m.id ? stop() : readOne(m))}>
                <span className="block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">{timeFmt(m.created_at, lang)}</span>
                <span className="mt-1 block text-sm text-foreground">{shown[i] ?? m.body}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
