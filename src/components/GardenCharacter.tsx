import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { messagesQuery, type NodeRow } from "@/lib/nodes";
import { canSpeak, speak, stopSpeaking } from "@/lib/speech";

export function GardenCharacter({ node }: { node: NodeRow }) {
  const { t, lang } = useI18n();
  const { data: messages = [] } = useQuery(messagesQuery(node.id));
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  const message = messages[0];
  return <div className="flex flex-wrap items-center gap-5 border-y border-border py-5">
    <div className={`garden-character ${playing ? "is-speaking" : ""}`} aria-hidden="true">
      <TreePine className="absolute inset-0 size-full text-kind-monument" />
      <div className="garden-face"><span className="garden-eye" /><span className="garden-eye" /><span className="garden-mouth" /></div>
    </div>
    <div className="min-w-0 flex-1 space-y-3">
      <p className="text-sm text-foreground">{message?.body ?? t("messages.empty")}</p>
      {message && <Button variant="outline" onClick={() => {
        if (playing) { stopSpeaking(); setPlaying(false); return; }
        if (!canSpeak()) return;
        setPlaying(true);
        speak(message.body, lang, () => setPlaying(false));
      }}>{t(playing ? "audio.stop" : "audio.listen")}</Button>}
    </div>
  </div>;
}