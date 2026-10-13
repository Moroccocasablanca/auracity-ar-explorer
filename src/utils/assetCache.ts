// Local copies of the app's own media (recorded voices, mascots, dishes), kept in the phone's Cache Storage:
// the second visit, and every visit without signal, plays instantly with no download.
// `resolveCached(url)` answers at once (no waiting), so audio can start inside the tap that asked for it.

const CACHE_NAME = "aura-assets-v1";
const ready = new Map<string, string>(); // original url -> object URL of the cached copy

const canCache = () => typeof window !== "undefined" && "caches" in window;
const slowNetwork = () => {
  const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(c?.saveData) || c?.effectiveType === "2g" || c?.effectiveType === "slow-2g";
};

/** The cached copy if it is already loaded in memory, otherwise the normal address (never waits). */
export const resolveCached = (url: string): string => ready.get(url) ?? url;

/** Loads one file into the cache (downloading it only if it is not stored yet) and into memory. */
export async function cacheAsset(url: string): Promise<boolean> {
  if (ready.has(url)) return true;
  if (!canCache()) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    let res = await cache.match(url);
    if (!res) {
      const net = await fetch(url);
      if (!net.ok) return false;
      await cache.put(url, net.clone());
      res = net;
    }
    ready.set(url, URL.createObjectURL(await res.blob()));
    return true;
  } catch {
    return false;
  }
}

/** Caches many files a few at a time. Skipped on data saver / very slow connections. */
export async function precacheAssets(urls: string[], concurrency = 3): Promise<number> {
  if (slowNetwork()) return 0;
  const queue = urls.filter((u) => !ready.has(u));
  let done = 0;
  const worker = async () => {
    for (let u = queue.shift(); u; u = queue.shift()) if (await cacheAsset(u)) done++;
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return done;
}

/** Runs the work when the phone is idle, so it never competes with the map or the camera. */
export function whenIdle(fn: () => void, timeoutMs = 4000): void {
  const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: timeoutMs });
  else window.setTimeout(fn, 1500);
}

/** Old versions of the cache are removed when the name changes. */
export async function cleanOldCaches(): Promise<void> {
  if (!canCache()) return;
  for (const k of await caches.keys()) if (k.startsWith("aura-assets-") && k !== CACHE_NAME) await caches.delete(k);
}
