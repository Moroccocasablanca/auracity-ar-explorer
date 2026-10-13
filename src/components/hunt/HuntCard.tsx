import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Map as MapIcon, PartyPopper, Volume2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { nodesQuery } from "@/lib/nodes";
import { AVATAR_IMG, buildHunt, huntDone, markHuntDone, rewardName, weekKey } from "@/lib/hunt";
import { logEvent } from "@/lib/quest";
import { speakNatural, stopSpeaking } from "@/services/voice/speech";
import { VoicePersona } from "@/services/voice/voice-persona";
import { contentLang } from "@/services/voice/text-speech";

/** The weekly treasure hunt: 3 riddles built from Bra's own places, new mascots every Monday. */
export function HuntCard() {
  const { t, lang } = useI18n();
  const { data: nodes = [] } = useQuery(nodesQuery);
  const items = useMemo(() => buildHunt(nodes), [nodes]);
  const [done, setDone] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  useEffect(() => setDone(huntDone()), []);
  // The AI rewrites this week's riddles in a nicer way (from the same facts); until it is ready, the built-in riddle is shown.
  const [ai, setAi] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!items.length) return;
    let stop = false;
    const body = JSON.stringify({ week: weekKey(), items: items.map((h) => ({ id: h.elementId, name: nodes.find((n) => n.id === h.nodeId)?.name ?? "", description: nodes.find((n) => n.id === h.nodeId)?.description_it ?? "" })) });
    (async () => {
      for (let i = 0; i < 4 && !stop; i++) {
        try {
          const r = await fetch("/api/hunt-riddles", { method: "POST", headers: { "content-type": "application/json" }, body });
          if (r.status === 200) { if (!stop) setAi((await r.json()) as Record<string, string>); return; }
          if (r.status !== 202) return;
        } catch { return; }
        await new Promise((res) => setTimeout(res, 15_000));
      }
    })();
    return () => { stop = true; };
  }, [items, nodes]);
  if (!items.length) return null;
  const found = items.filter((h) => done.includes(h.elementId)).length;
  const pick = (h: (typeof items)[number], id: string) => {
    if (id === h.nodeId) { markHuntDone(h.elementId); logEvent("riddle", h.elementId); setDone(huntDone()); setWrong(null); } else setWrong(h.elementId);
  };
  const listen = (h: (typeof items)[number]) => { stopSpeaking(); void speakNatural(lang === "it" ? (ai[h.elementId] ?? h.riddle.it) : h.riddle.en, contentLang(lang), undefined, VoicePersona.HUNT_DYNAMIC); };
  return (
    <section className="rounded-3xl border-2 border-fuchsia-300/50 bg-gradient-to-br from-fuchsia-400/15 to-amber-300/10 p-5">
      <p className="mono-label flex items-center gap-1.5"><MapIcon className="size-4" /> {t("treasure.title")} · {weekKey()}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("treasure.sub", { n: found, m: items.length })}</p>
      <div className="mt-3 space-y-3">
        {items.map((h) => {
          const ok = done.includes(h.elementId);
          return (
            <div key={h.elementId} className="rounded-2xl border border-border bg-card/70 p-3">
              <div className="flex items-start gap-3">
                <img src={AVATAR_IMG[h.currentAvatarType]} alt="" className="size-16 shrink-0 object-contain drop-shadow-lg" />
                <p className="flex-1 text-sm font-semibold leading-snug">{lang === "it" ? (ai[h.elementId] ?? h.riddle.it) : h.riddle.en}</p>
                <button type="button" aria-label={t("audio.listen")} onClick={() => listen(h)}><Volume2 className="size-5" /></button>
              </div>
              {ok ? (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-green-300"><PartyPopper className="size-4" /> {t("treasure.reward", { r: rewardName(h, lang) })}</p>
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
