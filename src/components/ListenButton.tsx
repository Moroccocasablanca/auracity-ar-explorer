import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Settings2, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { narrate, setVoiceChoice, stopSpeaking, voiceChoice, type VoiceChoice, type VoiceRequest } from "@/lib/speech";
import { naturalVoice } from "@/lib/voice.functions";
import { speakableIsEmpty, type Speakable } from "@/lib/text-speech";

/** Shared narration state: natural voice with phone-voice fallback. */
export function useNarrator() {
  const { lang } = useI18n();
  const fetcher = useServerFn(naturalVoice);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => stopSpeaking(), []);
  const play = useCallback(
    (id: string, req: VoiceRequest, text: Speakable) => {
      setPlaying(id);
      void narrate((d) => fetcher({ data: d }), req, text, lang, () => setPlaying((p) => (p === id ? null : p)));
    },
    [fetcher, lang],
  );
  const stop = useCallback(() => {
    stopSpeaking();
    setPlaying(null);
  }, []);
  return { playing, play, stop };
}

export function VoiceSettings() {
  const { t } = useI18n();
  const [choice, setChoice] = useState<VoiceChoice>("female");
  const [rate, setRate] = useState("1");
  useEffect(() => {
    setChoice(voiceChoice());
    setRate(localStorage.getItem("aura_voice_rate") ?? "1");
  }, []);
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium">{t("audio.voice")}</p>
        <div className="mt-1 grid grid-cols-3 gap-1">
          {(["female", "male", "device"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => { setChoice(v); setVoiceChoice(v); }}
              className={`rounded-md border px-2 py-1.5 text-xs ${choice === v ? "border-primary bg-primary/15" : "border-input"}`}
            >
              {t(v === "female" ? "audio.female" : v === "male" ? "audio.male" : "audio.device")}
            </button>
          ))}
        </div>
      </div>
      <label className="block text-xs font-medium">{t("audio.speed")}
        <input aria-label={t("audio.speed")} className="mt-2 w-full accent-primary" type="range" min="0.8" max="1.2" step="0.05" value={rate} onChange={(e) => { setRate(e.target.value); localStorage.setItem("aura_voice_rate", e.target.value); }} />
      </label>
    </div>
  );
}

export function ListenButton({ text, voice, compact = false, label }: { text: Speakable; voice: VoiceRequest; compact?: boolean; label?: string }) {
  const { t } = useI18n();
  const { playing, play, stop } = useNarrator();
  const [settings, setSettings] = useState(false);
  if (speakableIsEmpty(text)) return null;
  const id = `${voice.nodeId}:${voice.messageId ?? voice.source}${voice.full ? ":full" : ""}`;
  const on = playing === id;
  const Icon = on ? Square : Volume2;
  return (
    <div className="relative flex shrink-0 items-center gap-1">
      <Button
        variant="outline"
        type="button"
        onClick={() => (on ? stop() : play(id, voice, text))}
        aria-label={on ? t("audio.stop") : t("audio.listen")}
        className={compact ? "size-8 rounded-full p-0" : "h-10 rounded-full px-4"}
      >
        <Icon className="size-4" />
        {!compact && (on ? t("audio.stop") : (label ?? t("audio.listen")))}
      </Button>
      {!compact && (
        <Button variant="ghost" size="icon" title={t("audio.voice")} aria-label={t("audio.voice")} aria-expanded={settings} onClick={() => setSettings((v) => !v)}>
          <Settings2 />
        </Button>
      )}
      {settings && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 max-w-[80vw] rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-sm">
          <VoiceSettings />
        </div>
      )}
    </div>
  );
}
