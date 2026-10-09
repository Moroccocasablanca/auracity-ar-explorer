// Narration: natural AI voice (woman/man, cached per clip) with on-device speech as fallback.
import { LOCALE_TAG, type Lang } from "./i18n";

export type VoiceChoice = "female" | "male" | "device";
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function voiceChoice(): VoiceChoice {
  const v = typeof localStorage !== "undefined" ? localStorage.getItem("aura_voice_kind") : null;
  return v === "male" || v === "device" ? v : "female";
}
export const setVoiceChoice = (v: VoiceChoice) => localStorage.setItem("aura_voice_kind", v);

function rate() {
  const r = Number(localStorage.getItem("aura_voice_rate") ?? "1");
  return Number.isFinite(r) ? Math.min(1.2, Math.max(0.8, r)) : 1;
}

let current: HTMLAudioElement | null = null;

export function speak(text: string, lang: Lang, onEnd?: () => void) {
  if (!canSpeak()) return onEnd?.();
  window.speechSynthesis.cancel();
  const tag = LOCALE_TAG[lang];
  const code = tag.slice(0, 2).toLowerCase();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = tag;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(code));
  u.voice = voices.find((v) => /natural|premium|enhanced|neural/i.test(v.name)) ?? voices[0] ?? null;
  u.rate = rate();
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

export type VoiceRequest = { nodeId: string; source: "history" | "message"; messageId?: string };
type Fetcher = (req: VoiceRequest & { lang: Lang; voice: "female" | "male" }) => Promise<{ ok: boolean; url?: string }>;

/** Plays a clip with the chosen voice; falls back to the phone voice if the natural voice is unavailable. */
export async function narrate(fetcher: Fetcher, req: VoiceRequest, text: string, lang: Lang, onEnd: () => void) {
  stopSpeaking();
  const choice = voiceChoice();
  if (choice !== "device") {
    try {
      const res = await fetcher({ ...req, lang, voice: choice });
      if (res.ok && res.url) {
        const a = new Audio(res.url);
        a.playbackRate = rate();
        current = a;
        a.onended = () => onEnd();
        a.onerror = () => onEnd();
        await a.play();
        return;
      }
    } catch {
      /* fall back */
    }
  }
  speak(text, lang, onEnd);
}

export function stopSpeaking() {
  if (current) {
    current.pause();
    current = null;
  }
  if (canSpeak()) window.speechSynthesis.cancel();
}
