// AR overlay for a monument: subtitles at the bottom (hide them with a tap) and, when a model exists, its 3D model.
import { useEffect, useState } from "react";
import { Captions } from "lucide-react";
import { useNodeText } from "@/services/translate/use-node-text";
import { shortStory, type NodeRow } from "@/lib/nodes";
import { MONUMENT_MODELS } from "@/models3d/monument-models";

export function MonumentSubtitles({ node, bottomClass }: { node: NodeRow; bottomClass: string }) {
  const tx = useNodeText(node);
  const [hidden, setHidden] = useState(false);
  const text = shortStory(tx.history || tx.description);
  useEffect(() => setHidden(false), [node.id]);
  if (!text) return null;
  if (hidden)
    return (
      <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => setHidden(false)} aria-label="Sottotitoli" className={`absolute left-4 ${bottomClass} z-20 flex size-10 items-center justify-center rounded-full bg-black/60 text-white`}>
        <Captions className="size-5" />
      </button>
    );
  return (
    <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => setHidden(true)} className={`absolute inset-x-3 ${bottomClass} z-20 mx-auto max-w-md rounded-2xl bg-black/70 px-4 py-3 text-center text-[0.95rem] font-medium leading-snug text-white shadow-lg`}>
      <span className="mb-0.5 block font-mono text-[0.6rem] uppercase tracking-wider text-yellow-300">{node.name}</span>
      {text}
    </button>
  );
}

/** The 3D model of a monument, if there is one: it loads only when it comes into view, shows the photo while it loads, and can be turned with a finger. */
export function MonumentModel({ slug, poster, height = 180 }: { slug: string; poster?: string | null; height?: number }) {
  const url = MONUMENT_MODELS[slug];
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!url) return;
    void import("@google/model-viewer").then(() => setReady(true));
  }, [url]);
  if (!url) return null;
  if (!ready) return poster ? <img src={poster} alt="" className="w-full rounded-2xl object-cover" style={{ height }} /> : null;
  return (
    // @ts-expect-error model-viewer is a web component
    <model-viewer
      src={url}
      poster={poster ?? undefined}
      loading="lazy"
      reveal="auto"
      auto-rotate
      auto-rotate-delay="800"
      rotation-per-second="18deg"
      camera-controls
      interaction-prompt="auto"
      shadow-intensity="1"
      environment-image="neutral"
      touch-action="pan-y"
      style={{ width: "100%", height: `${height}px`, background: "transparent", borderRadius: "1rem" }}
    />
  );
}
