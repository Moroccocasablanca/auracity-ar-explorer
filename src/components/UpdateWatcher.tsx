// Silent updates: the app checks the server at start, when it comes back to the foreground and every 15 minutes.
// If a new build is out, it clears only the caches the release asks for, then reloads the moment the user leaves
// the app (never during a visit, a story or the camera). No signal or server down: nothing happens, the current version keeps working.
// Premium assets (aura-assets-*) are never removed here unless the release names them explicitly.
import { useEffect } from "react";

declare const __AURA_BUILD__: string;
const MY_BUILD = typeof __AURA_BUILD__ === "string" ? __AURA_BUILD__ : "dev";
const EVERY_MS = 15 * 60_000;

async function purge(list: string[]) {
  for (const name of list) {
    try { if ("caches" in window && (await caches.delete(name))) continue; } catch { /* ignore */ }
    try { localStorage.removeItem(name); } catch { /* private mode */ }
  }
}

export function UpdateWatcher() {
  useEffect(() => {
    if (MY_BUILD === "dev") return; // local dev server already hot-reloads
    let pending = false;
    let busy = false;

    const check = async () => {
      if (pending || busy || !navigator.onLine) return;
      busy = true;
      try {
        const ctrl = new AbortController();
        const t = window.setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch("/api/version", { cache: "no-store", signal: ctrl.signal });
        window.clearTimeout(t);
        if (!r.ok) return;
        const { build, purge: list } = (await r.json()) as { build?: string; purge?: string[] };
        if (!build || build === "dev" || build === MY_BUILD) return;
        await purge(Array.isArray(list) ? list : []);
        pending = true; // reload when the user leaves the app
      } catch { /* offline or server down: keep the current version */ } finally {
        busy = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden" && pending) window.location.reload();
      else if (document.visibilityState === "visible") void check();
    };

    const first = window.setTimeout(() => void check(), 8000);
    const timer = window.setInterval(() => void check(), EVERY_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return null;
}
