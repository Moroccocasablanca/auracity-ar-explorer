import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Armchair, TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { messagesQuery, type NodeRow } from "@/lib/nodes";
import { useNodeText } from "@/lib/use-node-text";
import { markDiscovered } from "@/lib/discovered";
import { useNarrator } from "./ListenButton";

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

/** Garden object that wakes up and reads the latest message when you arrive within its radius. */
export function GardenCharacter({ node, inRange }: { node: NodeRow; inRange: boolean }) {
  const { t } = useI18n();
  const { data: messages = [], isPending, isError } = useQuery(messagesQuery(node.id));
  const { playing, play, stop } = useNarrator();
  const woke = useRef(false);
  const latest = messages[0];
  const tx = useNodeText(node);
  const older = messages.slice(1, 10);

  const say = (m: { id: string; body: string }) => play(m.id, { nodeId: node.id, source: "message", messageId: m.id }, m.body);
  const welcome = () => play(node.id, { nodeId: node.id, source: "history" }, `${tx.name}. ${tx.history || tx.description}`);

  useEffect(() => {
    if (!inRange || isPending || isError || woke.current) return;
    woke.current = true;
    markDiscovered(node.id);
    if (latest) say(latest); else welcome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRange, isPending, isError, latest?.id]);

  return (
    <div className="space-y-3 border-y border-border py-5">
      <div className="flex flex-wrap items-center gap-5">
        <GardenFace kind={node.kind} speaking={playing != null} />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="mono-label !text-[0.6rem]">{t("garden.latest")}</p>
          <p className="text-sm text-foreground">{latest?.body ?? (tx.history || tx.description)}</p>
            <Button variant="outline" onClick={() => (playing ? stop() : latest ? say(latest) : welcome())}>
              {playing ? t("audio.stop") : t("garden.talk")}
            </Button>
        </div>
      </div>
      {older.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">{t("garden.older")} ({older.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {older.map((m) => (
              <li key={m.id}>
                <button type="button" className="text-left text-foreground/90 hover:text-primary" onClick={() => say(m)}>
                  {m.body}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
