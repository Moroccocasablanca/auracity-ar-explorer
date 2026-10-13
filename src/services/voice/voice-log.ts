// Small on-device log of what the voice did, so a problem heard outdoors can be explained afterwards (TEST ADMIN panel).
type Entry = { t: number; msg: string };
const KEY = "aura_voice_log";
const MAX = 40;

export function vlog(msg: string) {
  if (typeof window === "undefined") return;
  try {
    const list = JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as Entry[];
    list.push({ t: Date.now(), msg: msg.slice(0, 140) });
    sessionStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    /* logging must never break the voice */
  }
}

export function readVoiceLog(): string {
  try {
    const list = JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as Entry[];
    return list.map((e) => `${new Date(e.t).toLocaleTimeString("it-IT")} ${e.msg}`).join("\n");
  } catch {
    return "";
  }
}
