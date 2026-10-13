import { isNative, nativeNotice } from "./native";
// System notifications. iPhone only allows them through the service worker (installed app), so we go through it first.
export async function showSystemNotice(title: string, body: string, url: string, tag: string) {
  if (isNative()) return nativeNotice(title, body, url);
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, tag, icon: "/icon-192.png", badge: "/icon-192.png", data: { url } });
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    const n = new Notification(title, { body, tag, icon: "/icon-192.png" });
    n.onclick = () => {
      window.focus();
      window.location.assign(url);
    };
  } catch {
    /* in-app card still shows */
  }
}

export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    /* notifications will use the in-app card only */
  }
}
