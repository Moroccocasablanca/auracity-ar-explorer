// Native iPhone/Android shell (Capacitor): keeps the GPS alive in the background and shows real notifications.
// On the web these functions do nothing and the app uses the browser features instead.
import { Capacitor, registerPlugin } from "@capacitor/core";

export const isNative = () => typeof window !== "undefined" && Capacitor.isNativePlatform();

type BgLocation = { latitude: number; longitude: number; accuracy: number; speed: number | null };
type BgPlugin = {
  addWatcher: (
    opts: { backgroundMessage?: string; backgroundTitle?: string; requestPermissions?: boolean; stale?: boolean; distanceFilter?: number },
    cb: (loc?: BgLocation, err?: { code?: string }) => void,
  ) => Promise<string>;
  removeWatcher: (opts: { id: string }) => Promise<void>;
};
const BackgroundGeolocation = registerPlugin<BgPlugin>("BackgroundGeolocation");

/** Follows the phone even when the screen is locked. Returns a function that stops it. */
export async function startBackgroundWatch(onPos: (p: { lat: number; lng: number; accuracy: number }) => void, title: string, message: string) {
  if (!isNative()) return () => {};
  const id = await BackgroundGeolocation.addWatcher(
    { backgroundTitle: title, backgroundMessage: message, requestPermissions: true, stale: false, distanceFilter: 15 },
    (loc) => {
      if (loc) onPos({ lat: loc.latitude, lng: loc.longitude, accuracy: loc.accuracy });
    },
  );
  return () => void BackgroundGeolocation.removeWatcher({ id });
}

let notifId = 1000;

/** Real system notification (works with the phone locked). Tapping it opens the venue page. */
export async function nativeNotice(title: string, body: string, url: string) {
  if (!isNative()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") {
    const asked = await LocalNotifications.requestPermissions();
    if (asked.display !== "granted") return;
  }
  await LocalNotifications.schedule({ notifications: [{ id: notifId++, title, body, extra: { url } }] });
}

/** Opens the right page when a notification is tapped. */
export async function onNoticeTap(go: (url: string) => void) {
  if (!isNative()) return () => {};
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const h = await LocalNotifications.addListener("localNotificationActionPerformed", (e) => {
    const url = (e.notification.extra as { url?: string } | undefined)?.url;
    if (url) go(url);
  });
  return () => void h.remove();
}
