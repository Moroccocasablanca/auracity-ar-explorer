import { useCallback, useSyncExternalStore } from "react";

// Places the visitor saved with the heart. Kept on the phone (no account needed).
const KEY = "aura_favorites";
const listeners = new Set<() => void>();
let cache: string[] | null = null;

const read = (): string[] => {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    cache = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 200) : [];
  } catch {
    cache = [];
  }
  return cache;
};
const write = (ids: string[]) => {
  cache = ids;
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* private mode: it stays for this visit */ }
  listeners.forEach((l) => l());
};
const subscribe = (cb: () => void) => { listeners.add(cb); return () => void listeners.delete(cb); };
const EMPTY: string[] = [];

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);
  const toggle = useCallback((id: string) => write(read().includes(id) ? read().filter((x) => x !== id) : [id, ...read()]), []);
  return { ids, has: (id: string) => ids.includes(id), toggle };
}
