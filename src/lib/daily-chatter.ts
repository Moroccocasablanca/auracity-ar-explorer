import type { NodeRow } from "@/lib/nodes";
import { jokeFor } from "@/lib/jokes";
import { isGardenObject } from "@/lib/node-rules";
import { localize } from "@/lib/localize";
import type { Lang } from "@/lib/i18n";
import { partsForSpeech } from "@/services/voice/text-speech";

type Line = { greet: string; line: string };
type Day = { day: string; tree: Line[]; bench: Line[] };

const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
let cache: Day | null = null;
let loading: Promise<Day | null> | null = null;

/** The day's lines written by the AI. NEVER waits: if the server is still writing them (first visit of the day) this answers "not yet" at once,
 *  and the caller plays the recorded story instead, so a child never stands in front of a silent tree. */
export function loadChatter(): Promise<Day | null> {
  if (cache?.day === today()) return Promise.resolve(cache);
  loading ??= (async () => {
    try {
      const r = await fetch("/api/daily-chatter", { cache: "no-cache" });
      if (r.status === 200) {
        const d = (await r.json()) as Day;
        if (d.day === today()) return (cache = d);
      }
    } catch { /* offline: the recorded story is used */ }
    return null;
  })().finally(() => { loading = null; });
  return loading;
}

/** Asks for today's lines as soon as the map opens, so they are ready by the time someone taps a tree or a bench. */
export const warmChatter = () => void loadChatter();

/**
 * What this talking tree or bench says today: a fresh greeting and a fresh riddle / joke / curiosity.
 * Every object of the same kind gets its own line (its place in the list), and the next day everything is new.
 * If the AI lines are not ready the built-in jokes are used, which also change every day.
 */
export async function chatterFor(node: NodeRow, all: NodeRow[], lang: Lang): Promise<{ text: string; lang: Lang } | null> {
  if (node.kind !== "tree" && node.kind !== "bench") return null;
  const it = await italianChatter(node, all);
  return it ? localize(it, "it", lang) : null;
}

async function italianChatter(node: NodeRow, all: NodeRow[]): Promise<string | null> {
  const d = await loadChatter();
  const mates = all.filter((n) => n.kind === node.kind && isGardenObject(n)).map((n) => n.id).sort();
  const rank = Math.max(0, mates.indexOf(node.id));
  const pool = d ? (node.kind === "tree" ? d.tree : d.bench) : [];
  const pick = pool[rank % Math.max(1, pool.length)];
  if (pick) return `${pick.greet} ${pick.line}`;
  const j = jokeFor(node.kind, node.id, "it");
  return `Ciao! Oggi ho una battuta per te. ${j.q} ${j.a}`;
}

/** True when the voice of this text is already prepared on the server (so it starts at once). */
export async function voiceReady(text: string, lang: Lang = "it"): Promise<boolean> {
  try {
    const r = await fetch("/api/tts-ready", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ parts: partsForSpeech(text, lang), voice: "young", lang }) });
    return r.ok && ((await r.json()) as { ready?: boolean }).ready === true;
  } catch {
    return false;
  }
}

/** Prepares the voice of this text in the background (one piece at a time), so the next child who taps hears it without waiting. */
export async function warmVoice(text: string, lang: Lang = "it"): Promise<void> {
  for (const part of partsForSpeech(text, lang)) {
    try { await fetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: part, voice: "young", lang }) }); } catch { return; }
  }
}
