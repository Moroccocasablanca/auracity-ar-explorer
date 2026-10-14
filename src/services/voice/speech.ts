// Narration. Natural voices only: recorded stories first (instant), then our server voice (Google), and the phone's own
// voice only as a last resort when nothing else works. Who speaks is decided by `voice-persona.ts`, never by a general setting.
import { LOCALE_TAG, type Lang } from "@/lib/i18n";
import { speechText, splitSentences, type Speakable } from "@/services/voice/text-speech";
import { vlog } from "@/services/voice/voice-log";
import { cachedJson } from "@/utils/cache";
import { resolveCached } from "@/utils/assetCache";
import { personaForKind, personaVoice, VoicePersona, type VoiceKind } from "@/services/voice/voice-persona";

export { personaForKind };
export type Persona = string | undefined;
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

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

// ---------------------------------------------------------------- the phone's own voice (last resort)
const FEMALE_NAMES = /alice|federica|paola|elsa|isabella|giorgia|silvia|carla|chiara|amelie|marie|anna|monica|helena|laura|sara|ioana|zira/i;
const MALE_NAMES = /luca|diego|cosimo|jorge|thomas|daniel|reed|eddy|marco|paulo|yannick|markus|andrei/i;

function voiceScore(v: SpeechSynthesisVoice, kind: VoiceKind) {
  const n = v.name;
  let score = 0;
  if (/premium|enhanced|natural|neural|studio|wavenet/i.test(n)) score += 50;
  if (/siri|google|microsoft .*online/i.test(n)) score += 30;
  if (kind === "male" ? MALE_NAMES.test(n) : FEMALE_NAMES.test(n)) score += 25; // the right sex for the profile
  if (kind !== "male" && MALE_NAMES.test(n)) score -= 25;
  if (/compact|espeak|robot|fred|zarvox|trinoids|whisper|bad news|bubbles/i.test(n)) score -= 100;
  if (!v.localService) score += 10;
  return score;
}

export function pickDeviceVoice(tag: string, kind: VoiceKind = "female") {
  const code = tag.slice(0, 2).toLowerCase();
  const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(code));
  const exact = all.filter((v) => v.lang.toLowerCase().replace("_", "-") === tag.toLowerCase());
  return [...(exact.length ? exact : all)].sort((a, b) => voiceScore(b, kind) - voiceScore(a, kind))[0] ?? null;
}

export function speak(raw: string, lang: Lang, onEnd?: () => void, kind: VoiceKind = "female") {
  const text = speechText(raw, lang);
  if (!canSpeak()) return onEnd?.();
  const synth = window.speechSynthesis;
  synth.cancel();
  const tag = LOCALE_TAG[lang];
  const voice = pickDeviceVoice(tag, kind);
  const parts = splitSentences(text);
  if (parts.length === 0) return onEnd?.();
  vlog(`telefono (ultima scelta): ${parts.length} frasi, voce ${voice?.name ?? "predefinita"}`);
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    window.clearInterval(keepAlive);
    onEnd?.();
  };
  // All sentences are queued at once: chaining them from "end" events stops half-way on iPhone Safari.
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p);
    u.lang = tag;
    u.voice = voice;
    u.rate = Math.min(1.1, rate() * 0.95);
    u.pitch = kind === "young" ? 1.1 : 1;
    if (i === parts.length - 1) {
      u.onend = done;
      u.onerror = done;
    }
    synth.speak(u);
  });
  // Safari silently pauses long speech: nudge it every few seconds until the last sentence ends.
  const keepAlive = window.setInterval(() => {
    if (!synth.speaking && !synth.pending) return done();
    if (synth.paused) synth.resume();
  }, 4000);
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
      if (!played && i === 0) return void speak(parts.join(" "), lang, onEnd, kind);
      if (!upcoming) break;
      const nextUrl = await upcoming;
      if (my !== serverRun) return;
      if (!nextUrl) return void speak(parts.slice(i + 1).join(" "), lang, onEnd, kind); // carry on from where the server stopped
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
  speak(text, lang, onEnd, kind);
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
  if (canSpeak()) window.speechSynthesis.cancel();
}
