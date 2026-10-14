// Narration. Natural voices only: recorded stories first (instant), then our server voice (Google). There is no robot or
// phone voice at all: if nothing natural is available the app stays quiet. Who speaks is decided by `voice-persona.ts`.
import { type Lang } from "@/lib/i18n";
import { speechText, splitSentences, type Speakable } from "@/services/voice/text-speech";
import { vlog } from "@/services/voice/voice-log";
import { cachedJson } from "@/utils/cache";
import { resolveCached } from "@/utils/assetCache";
import { personaForKind, personaVoice, VoicePersona, type VoiceKind } from "@/services/voice/voice-persona";

export { personaForKind };
export type Persona = string | undefined;

function rate() {
  const r = Number(localStorage.getItem("aura_voice_rate") ?? "1");
  return Number.isFinite(r) ? Math.min(1.2, Math.max(0.8, r)) : 1;
}

let current: HTMLAudioElement | null = null;

// ---------------------------------------------------------------- audio unlock (iPhone only plays after a tap)
let shared: HTMLAudioElement | null = null;
let unlocked = false;
/** The first tap unlocks one audio element that is then reused for every clip, so later clips can start without a new tap. */
export function primeAudio(): void {
  if (typeof window === "undefined" || unlocked) return;
  const unlock = () => {
    if (unlocked) return;
    shared = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=");
    shared.play().then(() => { unlocked = true; }).catch(() => { shared = null; });
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("touchend", unlock);
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("touchend", unlock, { passive: true });
}

// ---------------------------------------------------------------- when the natural voice is not available
/** There is NO robot fallback: if the natural voice cannot be made right now the app stays quiet, shows the text and tells the visitor. */
function voiceUnavailable(onEnd?: () => void) {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("aura-voice-unavailable"));
  onEnd?.();
}

// ---------------------------------------------------------------- the natural voice of our server (Google), all nine languages
const SERVER_LANGS = new Set<Lang>(["it", "en", "fr", "de", "es", "ar", "ro", "sq", "hi"]);
let serverOffUntil = 0;
let serverRun = 0; // changes every time speech starts or stops, so an old chain of clips stops by itself

/** Cuts a long text at sentence ends into pieces the server can voice in one go (it accepts up to 700 characters). */
export function chunkForServer(text: string, max = 600): string[] {
  const out: string[] = [];
  let cur = "";
  for (const s of splitSentences(text)) {
    if (cur && (cur + " " + s).length > max) {
      out.push(cur);
      cur = s;
    } else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push(cur);
  return out.flatMap((c) => (c.length <= max + 80 ? [c] : c.match(new RegExp(`.{1,${max}}(\\s|$)`, "g")) ?? [c]));
}

async function serverClip(text: string, kind: VoiceKind, lang: Lang): Promise<string | null> {
  try {
    const res = await fetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, voice: kind, lang }) });
    if (!res.ok) {
      serverOffUntil = Date.now() + (res.status === 429 ? 10 : 2) * 60_000; // do not keep asking while the quota is used up
      vlog(`voce naturale non disponibile (${res.status})`);
      return null;
    }
    return URL.createObjectURL(await res.blob());
  } catch {
    serverOffUntil = Date.now() + 60_000;
    return null;
  }
}

/** Starts one clip on the unlocked audio element (or a new one). `started` says whether the phone allowed it, `ended` when it is over. */
function startClip(url: string): { started: Promise<boolean>; ended: Promise<boolean> } {
  const a = shared && unlocked ? shared : new Audio();
  a.onended = null;
  a.onerror = null;
  a.src = url;
  a.playbackRate = rate();
  current = a;
  const ended = new Promise<boolean>((resolve) => {
    a.onended = () => resolve(true);
    a.onerror = () => resolve(false);
  });
  const started = a.play().then(() => true, () => false);
  return { started, ended };
}

/** Natural voice, in pieces: the next piece is prepared while the current one plays, so there are no pauses. */
async function speakFromServer(text: string, kind: VoiceKind, lang: Lang, onEnd?: () => void): Promise<boolean> {
  if (Date.now() < serverOffUntil || !SERVER_LANGS.has(lang)) return false;
  const parts = chunkForServer(text);
  if (!parts.length) return false;
  const my = ++serverRun;
  const first = await serverClip(parts[0]!, kind, lang);
  if (!first || my !== serverRun) return Boolean(first && my !== serverRun);
  void (async () => {
    let url: string = first;
    for (let i = 0; i < parts.length; i++) {
      const upcoming = i + 1 < parts.length ? serverClip(parts[i + 1]!, kind, lang) : null;
      const clip = startClip(url);
      const played = (await clip.started) && (await clip.ended);
      URL.revokeObjectURL(url);
      if (my !== serverRun) return;
      if (!played && i === 0) return void voiceUnavailable(onEnd);
      if (!upcoming) break;
      const nextUrl = await upcoming;
      if (my !== serverRun) return;
      if (!nextUrl) return void voiceUnavailable(onEnd); // the server could not make the next piece: stop quietly
      url = nextUrl;
    }
    onEnd?.();
  })();
  return true;
}

/** The voice that fits the profile: server (natural) first, the phone's own voice only if that fails. */
export async function speakNatural(raw: string, lang: Lang, onEnd?: () => void, persona?: Persona, venueVoice?: "female" | "male") {
  const text = speechText(raw, lang);
  const { kind } = personaVoice(persona, venueVoice);
  if (await speakFromServer(text, kind, lang, onEnd)) return;
  voiceUnavailable(onEnd);
}

// ---------------------------------------------------------------- recorded stories (instant, offline)
let clipList: Promise<Set<string>> | null = null;
/** The recorded story of a place: the complete one when it exists, otherwise the short one (never for a "tell me everything" request). */
async function bundledClip(nodeId: string, wantFull: boolean): Promise<string | null> {
  clipList ??= cachedJson<string[]>("/audio/manifest.json").then((l) => new Set(l ?? []));
  const set = await clipList;
  const pick = set.has(`${nodeId}-full.m4a`) ? `${nodeId}-full.m4a` : !wantFull && set.has(`${nodeId}.m4a`) ? `${nodeId}.m4a` : null;
  return pick ? resolveCached(`/audio/${pick}`) : null; // the local copy when it is already stored
}

export type VoiceRequest = { nodeId: string; source: "history" | "message"; messageId?: string; persona?: Persona; /** language of the text being read (defaults to the app language) */ lang?: Lang; /** read the whole text, not the short version */ full?: boolean };

/** Plays the story of a place: the recording if there is one, otherwise the natural voice, always the profile's own voice. */
export async function narrate(request: VoiceRequest, text: Speakable, lang: Lang, onEnd: () => void) {
  const { persona, full, lang: textLang, ...req } = request;
  lang = textLang ?? lang;
  stopSpeaking();
  if (req.source === "history" && lang === "it") {
    const url = await bundledClip(req.nodeId, Boolean(full));
    if (url) {
      vlog("voce registrata nell'app");
      serverRun++;
      const clip = startClip(url);
      if (await clip.started) {
        void clip.ended.then(() => onEnd());
        return;
      }
    }
  }
  // Messages left by visitors always speak with the young voice.
  void speakAny(text, lang, onEnd, persona ?? (req.source === "message" ? VoicePersona.HUNT_DYNAMIC : undefined));
}

let segRun = 0;

/** Reads pieces in their own languages one after the other (e.g. an Italian place name inside an English sentence). */
export async function speakSegments(segs: { text: string; lang: Lang }[], onEnd?: () => void, persona?: Persona, venueVoice?: "female" | "male") {
  const my = ++segRun;
  for (const seg of segs) {
    if (my !== segRun) return;
    if (!seg.text.trim()) continue;
    await new Promise<void>((resolve) => void speakNatural(seg.text, seg.lang, resolve, persona, venueVoice));
  }
  if (my === segRun) onEnd?.();
}

export const speakAny = (x: Speakable, lang: Lang, onEnd?: () => void, persona?: Persona, venueVoice?: "female" | "male") =>
  typeof x === "string" ? speakNatural(x, lang, onEnd, persona, venueVoice) : speakSegments(x, onEnd, persona, venueVoice);

export function stopSpeaking() {
  segRun++;
  serverRun++;
  if (current) {
    current.pause();
    current.onended = null;
    current = null;
  }
}
