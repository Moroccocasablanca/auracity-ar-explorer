// On-device text-to-speech (Web Speech API): free, works offline, no data leaves the phone.
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function speak(text: string, lang: "it" | "en", onEnd?: () => void) {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "it" ? "it-IT" : "en-GB";
  const voices = window.speechSynthesis.getVoices();
  const preferred = localStorage.getItem(`aura_voice_${lang}`);
  u.voice = voices.find((v) => v.voiceURI === preferred && v.lang.toLowerCase().startsWith(lang))
    ?? voices.find((v) => v.lang.toLowerCase().startsWith(lang) && /natural|premium|enhanced/i.test(v.name))
    ?? voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
  const savedRate = Number(localStorage.getItem("aura_voice_rate") ?? "0.98");
  u.rate = Number.isFinite(savedRate) ? Math.min(1.2, Math.max(0.8, savedRate)) : 0.98;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
