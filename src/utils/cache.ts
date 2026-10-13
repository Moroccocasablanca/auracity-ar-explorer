// Small performance helpers: a time-limited cache (also kept for the session), request de-duplication and throttling.

type Entry<V> = { v: V; at: number };

/** Memory cache with a time limit and a size limit; the oldest entry goes first. */
export function createTtlCache<K, V>(ttlMs: number, max = 100) {
  const m = new Map<K, Entry<V>>();
  return {
    get(k: K): V | undefined {
      const e = m.get(k);
      if (!e) return undefined;
      if (Date.now() - e.at > ttlMs) {
        m.delete(k);
        return undefined;
      }
      return e.v;
    },
    set(k: K, v: V) {
      m.set(k, { v, at: Date.now() });
      if (m.size > max) m.delete(m.keys().next().value as K);
    },
    clear: () => m.clear(),
  };
}

const inflight = new Map<string, Promise<unknown>>();
const jsonCache = createTtlCache<string, unknown>(60 * 60_000, 60);

/** Fetches JSON once even if many components ask at the same time, and remembers it for an hour. */
export async function cachedJson<T>(url: string): Promise<T | null> {
  const hit = jsonCache.get(url);
  if (hit !== undefined) return hit as T;
  let p = inflight.get(url) as Promise<T | null> | undefined;
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
      .catch(() => null)
      .finally(() => inflight.delete(url));
    inflight.set(url, p);
  }
  const v = await p;
  if (v !== null) jsonCache.set(url, v);
  return v;
}

/** Runs `fn` at most once every `ms` (used for compass and scroll handlers). */
export function throttle<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let last = 0;
  return (...a: A) => {
    const now = performance.now();
    if (now - last >= ms) {
      last = now;
      fn(...a);
    }
  };
}

/** Runs `fn` once things have been quiet for `ms`. */
export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t = 0;
  return (...a: A) => {
    window.clearTimeout(t);
    t = window.setTimeout(() => fn(...a), ms);
  };
}
