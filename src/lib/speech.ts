// On-device text-to-speech (Web Speech API): free, works offline, no data leaves the phone.
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function speak(text: string, lang: "it" | "en", onEnd?: () => void) {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "it" ? "it-IT" : "en-GB";
  u.rate = 0.98;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
