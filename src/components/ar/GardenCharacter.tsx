import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Armchair, TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { messagesQuery, type NodeRow } from "@/lib/nodes";
import { useNodeText } from "@/services/translate/use-node-text";
import { markDiscovered } from "@/lib/discovered";
import { DEMO_MESSAGES } from "@/lib/jokes";
import { detectTextLang, greetingWithName } from "@/services/voice/text-speech";
import { useLocalMessages } from "@/lib/local-messages";
import { canUseTestAdmin } from "@/config/systemConfig";
import { speakAny, speakNatural, stopSpeaking } from "@/services/voice/speech";

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

  useEffect(() => () => stopSpeaking(), []);

  const readOne = (m: { id: string; body: string }) => {
    run.current++;
    setReading(m.id);
    void speakNatural(m.body, detectTextLang(m.body, lang), () => setReading((r) => (r === m.id ? null : r)));
  };
  const readAll = () => {
    const my = ++run.current;
    const step = (i: number) => {
      if (my !== run.current || i >= feed.length) return setReading(null);
      setReading(feed[i]!.id);
      void speakNatural(feed[i]!.body, detectTextLang(feed[i]!.body, lang), () => setTimeout(() => step(i + 1), 500));
    };
    step(0);
  };
  const invite = () => {
    run.current++;
    setReading("invite");
    void speakAny(greetingWithName(t("garden.hello", { name: "§" }), node.name, lang, t("garden.empty")), lang, () => setReading(null));
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
      {feed.length > 0 && (
        <ul className="space-y-2">
          {feed.map((m) => (
            <li key={m.id} className={`rounded-2xl border p-3 ${reading === m.id ? "border-primary bg-primary/10" : "border-border bg-card/50"}`}>
              <button type="button" className="block w-full text-left" onClick={() => (reading === m.id ? stop() : readOne(m))}>
                <span className="block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">{timeFmt(m.created_at, lang)}</span>
                <span className="mt-1 block text-sm text-foreground">{m.body}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
