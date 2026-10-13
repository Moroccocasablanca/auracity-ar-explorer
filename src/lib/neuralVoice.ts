// Free on-device neural voice (Piper). Runs in the browser, no server and no credits.
// The voice model (~60 MB) downloads once and is kept by the browser; until then the phone voice is used.
import type { Lang } from "./i18n";
import type { Persona } from "./speech";
import { speechText, splitSentences } from "./text-speech";
import { vlog } from "./voice-log";

type Pair = { female: string; male: string };
const VOICES: Partial<Record<Lang, Pair>> = {
  it: { female: "it_IT-paola-medium", male: "it_IT-riccardo-x_low" },
  en: { female: "en_US-hfc_female-medium", male: "en_US-hfc_male-medium" },
  de: { female: "de_DE-ramona-low", male: "de_DE-thorsten-medium" },
  es: { female: "es_ES-sharvard-medium", male: "es_ES-davefx-medium" },
  fr: { female: "fr_FR-siwis-medium", male: "fr_FR-tom-medium" },
  ro: { female: "ro_RO-mihai-medium", male: "ro_RO-mihai-medium" },
};

type Piper = typeof import("@mintplex-labs/piper-tts-web");
let lib: Promise<Piper> | null = null;
const clips = new Map<string, Promise<Blob>>();
const ready = new Set<string>();
let audio: HTMLAudioElement | null = null;
let shared: HTMLAudioElement | null = null;
let unlocked = false;

/** iPhone Safari only lets audio start from a tap. A single shared element, primed by the first touch, can be reused later. */
export function primeAudio() {
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
let token = 0;

export const hasNeuralVoice = (lang: Lang) => Boolean(VOICES[lang]);

function voiceId(lang: Lang, kind: "female" | "male") {
  return VOICES[lang]?.[kind] ?? null;
}

// The runtime files are served from /public (same origin), so nothing depends on a third-party CDN being up.
const piper = () =>
  (lib ??= import("@mintplex-labs/piper-tts-web").then((m) => {
    Object.assign(m.TtsSession.WASM_LOCATIONS, {
      onnxWasm: `${location.origin}/ort/`,
      piperData: `${location.origin}/piper/piper_phonemize.data`,
      piperWasm: `${location.origin}/piper/piper_phonemize.wasm`,
    });
    return m;
  }));

/** True when the voice model is already on this device, so speaking will start instantly. */
export function isNeuralReady(lang: Lang, kind: "female" | "male") {
  const id = voiceId(lang, kind);
  return id != null && ready.has(id);
}

function sentences(text: string) {
  const parts = splitSentences(speechText(text));
  const out: string[] = [];
  for (const p of parts) {
    const last = out[out.length - 1];
    if (last && last.length < 40) out[out.length - 1] = `${last} ${p}`;
    else out.push(p);
  }
  return out;
}

function clip(id: string, text: string): Promise<Blob> {
  const key = `${id}|${text}`;
  let p = clips.get(key);
  if (!p) {
    p = piper().then(async (m) => {
      const blob = await m.predict({ text, voiceId: id as never });
      ready.add(id);
      return blob;
    });
    p.catch(() => clips.delete(key));
    clips.set(key, p);
    if (clips.size > 60) clips.delete(clips.keys().next().value as string);
  }
  return p;
}

/** Starts downloading the voice in the background (skipped on data-saver / very slow connections). */
export function warmNeuralVoice(lang: Lang, kind: "female" | "male" = "female") {
  const id = voiceId(lang, kind);
  const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!id || ready.has(id) || c?.saveData || c?.effectiveType === "2g" || c?.effectiveType === "slow-2g") return;
  void clip(id, ".").catch(() => undefined);
}

export function stopNeural() {
  token++;
  if (audio) {
    audio.pause();
    audio = null;
  }
}

/** Speaks with the neural voice, sentence by sentence (the next one is prepared while the current plays).
 *  Resolves false if the neural voice is unavailable, so the caller can fall back to the phone voice. */
export type NeuralResult = { ok: true } | { ok: false; remaining: string };

export async function speakNeural(text: string, lang: Lang, kind: "female" | "male", rate: number, persona: Persona, onEnd: () => void): Promise<NeuralResult> {
  const id = voiceId(lang, kind);
  if (!id || typeof Audio === "undefined") return { ok: false, remaining: text };
  stopNeural();
  const my = token;
  const parts = sentences(text);
  let i = 0;
  vlog(`neural ${lang}: ${parts.length} frasi, modello ${isNeuralReady(lang, kind) ? "pronto" : "da scaricare"}`);
  try {
    let next = clip(id, parts[0]!);
    for (; i < parts.length; i++) {
      const blob = await next;
      if (my !== token) {
        vlog(`neural: interrotto prima della frase ${i + 1}`);
        return { ok: true };
      }
      if (i + 1 < parts.length) next = clip(id, parts[i + 1]!);
      const a = shared ?? new Audio();
      a.src = URL.createObjectURL(blob);
      // Storyteller pace: slightly slower than normal speech, natural pitch.
      void persona;
      a.playbackRate = rate * 0.94;
      // The lively game voice is a little higher and quicker; every other voice keeps a natural pitch.
      (a as unknown as { preservesPitch: boolean }).preservesPitch = persona !== "TEEN_PLAYFUL";
      if (persona === "TEEN_PLAYFUL") a.playbackRate = rate * 1.0;
      audio = a;
      await new Promise<void>((resolve, reject) => {
        let timer = 0;
        const finish = () => {
          window.clearTimeout(timer);
          resolve();
        };
        a.onended = finish;
        a.onerror = () => {
          window.clearTimeout(timer);
          reject(new Error("audio"));
        };
        vlog(`neural: frase ${i + 1}/${parts.length} parte`);
        a.play().then(() => {
          // Safety net: some phones never fire "ended", so move on when the clip should have finished.
          const d = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : 12;
          timer = window.setTimeout(finish, (d / Math.max(0.5, a.playbackRate)) * 1000 + 1500);
        }, reject);
      });
      URL.revokeObjectURL(a.src);
      a.onended = null;
      a.onerror = null;
      // A short breath between sentences, like a person telling a story.
      if (i + 1 < parts.length) await new Promise((r) => setTimeout(r, 280));
    }
    vlog("neural: finito");
    if (my === token) onEnd();
    return { ok: true };
  } catch (e) {
    if (my !== token) return { ok: true };
    console.error("neural voice", e);
    vlog(`neural: ERRORE alla frase ${i + 1}: ${String(e).slice(0, 80)}`);
    return { ok: false, remaining: parts.slice(i).join(" ") };
  }
}

/** Builds one clip without playing it (used to check that every text can be synthesised). */
export async function neuralClip(lang: Lang, kind: "female" | "male", text: string): Promise<Blob | null> {
  const id = voiceId(lang, kind);
  if (!id) return null;
  return clip(id, text);
}
export { sentences as neuralSentences };
