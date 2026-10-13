// Automatic treasure hunt: every week (or for an event) the app picks places of Bra, gives each a new mascot
// and builds a riddle from the place's own text (name hidden). No manual work, nothing to pay.
import type { Lang } from "./i18n";
import type { NodeRow } from "./nodes";
import { splitSentences } from "./text-speech";

export type HuntAvatar = "CUBE_MAGIC" | "ANIMAL_MASCOT" | "MYSTERY_OBJECT";

export interface HuntElement {
  elementId: string;
  rotationCycle: "WEEKLY" | "EVENT";
  currentAvatarType: HuntAvatar;
  generatedRiddle: string;
  rewardUnlocked: string;
}

/** Modern 3D illustrations (made with AI) for the weekly mascots. */
export const AVATAR_IMG: Record<HuntAvatar, string> = { CUBE_MAGIC: "/mascots/hunt-cube.png", ANIMAL_MASCOT: "/mascots/hunt-owl.png", MYSTERY_OBJECT: "/mascots/hunt-orb.png" };
const AVATARS: HuntAvatar[] = ["CUBE_MAGIC", "ANIMAL_MASCOT", "MYSTERY_OBJECT"];
const REWARDS = [
  { it: "Sticker «Esploratore di Bra»", en: "“Bra Explorer” sticker" },
  { it: "Medaglia del Tesoro", en: "Treasure medal" },
  { it: "Cappello da Detective", en: "Detective hat" },
  { it: "Mappa Segreta", en: "Secret map" },
];

/** ISO-like week number, used to rotate the hunt every Monday. */
export function weekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const wk = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86_400_000 + 1) / 7);
  return `${y}-W${String(wk).padStart(2, "0")}`;
}

const seeded = (seed: string) => {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822069) >>> 0) / 4294967296);
};

const stopWords = new Set(["di", "del", "della", "dei", "delle", "da", "san", "santa", "chiesa", "palazzo", "museo", "the", "of", "church", "museum", "palace"]);

/** Hide the place's name (and its main words) inside its own description. */
function hideName(text: string, name: string): string {
  let out = text;
  for (const w of name.split(/[\s·\-,]+/).filter((x) => x.length > 3 && !stopWords.has(x.toLowerCase()))) {
    out = out.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "…");
  }
  return out;
}

export interface HuntItem extends HuntElement {
  nodeId: string;
  options: { id: string; name: string }[]; // shuffled: one is right
  riddle: { it: string; en: string };
}

export function buildHunt(nodes: NodeRow[], cycleKey = weekKey(), count = 3, cycle: "WEEKLY" | "EVENT" = "WEEKLY"): HuntItem[] {
  const pool = nodes.filter((n) => n.kind === "monument" && (n.description_it || "").length > 40);
  if (pool.length < 3) return [];
  const rnd = seeded(cycleKey);
  const shuffle = <T,>(a: T[]) => a.map((x) => [rnd(), x] as const).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
  const picks = shuffle(pool).slice(0, count);
  return picks.map((n, i) => {
    const clue = (txt: string) => {
      const s = splitSentences(txt.replace(/\s+/g, " ").trim()).slice(0, 2).join(" ");
      return hideName(s, n.name);
    };
    const it = `Sono un luogo di Bra e mi sono nascosto. ${clue(n.description_it)} Chi sono?`;
    const en = `I am a place in Bra and I am hiding. ${clue(n.description_en || n.description_it)} Who am I?`;
    const others = shuffle(pool.filter((p) => p.id !== n.id)).slice(0, 2);
    const reward = REWARDS[Math.floor(rnd() * REWARDS.length)]!;
    return {
      elementId: `${cycleKey}-${n.id}`,
      nodeId: n.id,
      rotationCycle: cycle,
      currentAvatarType: AVATARS[(i + Math.floor(rnd() * 3)) % 3]!,
      generatedRiddle: it,
      rewardUnlocked: reward.it,
      riddle: { it, en },
      options: shuffle([n, ...others]).map((x) => ({ id: x.id, name: x.name.split(" · ")[0]! })),
      // English reward name kept next to the Italian one
      ...({ rewardEn: reward.en } as object),
    };
  });
}

export const rewardName = (h: HuntItem, lang: Lang) => (lang === "it" ? h.rewardUnlocked : ((h as unknown as { rewardEn?: string }).rewardEn ?? h.rewardUnlocked));

const KEY = "aura_hunt_done";
export const huntDone = (): string[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]; } catch { return []; }
};
export function markHuntDone(id: string) {
  try { localStorage.setItem(KEY, JSON.stringify([...new Set([...huntDone(), id])].slice(-60))); } catch { /* ignore */ }
}
