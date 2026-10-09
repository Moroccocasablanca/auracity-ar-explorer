import { useEffect, useState } from "react";
import { Settings2, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { canSpeak, speak, stopSpeaking } from "@/lib/speech";

export function ListenButton({ text, compact = false }: { text: string; compact?: boolean }) {
  const { t, lang } = useI18n();
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [settings, setSettings] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState("");
  const [rate, setRate] = useState("0.98");
  useEffect(() => {
    setSupported(canSpeak());
    return () => stopSpeaking();
  }, []);
  useEffect(() => {
    if (!canSpeak()) return;
    const update = () => setVoices(window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang)));
    update();
    setVoice(localStorage.getItem(`aura_voice_${lang}`) ?? "");
    setRate(localStorage.getItem("aura_voice_rate") ?? "0.98");
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, [lang]);
  if (!supported || !text) return null;

  const toggle = () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
    } else {
      setPlaying(true);
      speak(text, lang, () => setPlaying(false));
    }
  };
  const Icon = playing ? Square : Volume2;
  return (
    <div className="relative flex shrink-0 items-center gap-1">
    <Button variant="outline"
      type="button"
      onClick={toggle}
      aria-label={playing ? t("audio.stop") : t("audio.listen")}
      className={
        compact
          ? "inline-flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          : "inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-accent"
      }
    >
      <Icon className="size-4" />
      {!compact && (playing ? t("audio.stop") : t("audio.listen"))}
    </Button>
    {!compact && <Button variant="ghost" size="icon" title={t("audio.voice")} aria-label={t("audio.voice")} aria-expanded={settings} onClick={() => setSettings((v) => !v)}><Settings2 /></Button>}
    {settings && <div className="absolute right-0 top-full z-20 mt-2 w-60 max-w-[80vw] space-y-3 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-sm">
      <label className="block text-xs font-medium">{t("audio.voice")}
        <select className="mt-1 w-full rounded-md border border-input bg-card p-2 text-sm" value={voice} onChange={(e) => { setVoice(e.target.value); localStorage.setItem(`aura_voice_${lang}`, e.target.value); }}>
          <option value="">{t("audio.default")}</option>
          {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
        </select>
      </label>
      <label className="block text-xs font-medium">{t("audio.speed")}
        <input aria-label={t("audio.speed")} className="mt-2 w-full accent-primary" type="range" min="0.8" max="1.2" step="0.05" value={rate} onChange={(e) => { setRate(e.target.value); localStorage.setItem("aura_voice_rate", e.target.value); }} />
      </label>
    </div>}
    </div>
  );
}
