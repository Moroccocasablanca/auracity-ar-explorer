import { useEffect, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { canSpeak, speak, stopSpeaking } from "@/lib/speech";

export function ListenButton({ text, compact = false }: { text: string; compact?: boolean }) {
  const { t, lang } = useI18n();
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    setSupported(canSpeak());
    return () => stopSpeaking();
  }, []);
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
    <button
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
    </button>
  );
}
