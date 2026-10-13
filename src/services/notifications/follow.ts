// "Segui il locale": a customer chooses which venues may notify them, and how:
//  - nearby: an alert when I walk past the venue
//  - remote: the venue's menu / offers / classes of the day, even when I am far away
// In this test version the choices live on the phone; delivering to other phones needs the venue accounts, a database table of
// followers and a push service (see STATO.md).
import { useCallback, useEffect, useState } from "react";
import { isNative, nativeNotice } from "@/services/platform/native";

const KEY = "aura_following";
const EVENT = "aura-following";

export type FollowOpts = { nearby: boolean; remote: boolean };
type Store = Record<string, FollowOpts>;

function read(): Store {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}") as unknown;
    if (Array.isArray(v)) return Object.fromEntries((v as string[]).map((id) => [id, { nearby: true, remote: true }])); // old format
    return v as Store;
  } catch {
    return {};
  }
}
const write = (s: Store) => {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event(EVENT));
};

export const followingIds = (): string[] => Object.keys(read());
export const followOpts = (id: string): FollowOpts | null => read()[id] ?? null;

async function askPermission() {
  try {
    if (isNative()) {
      await nativeNotice("AURACITY", "✓", "/explore").catch(() => undefined);
      return;
    }
    if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission();
  } catch {
    /* in-app cards still work */
  }
}

export function useFollowing(nodeId?: string) {
  const [store, setStore] = useState<Store>({});
  useEffect(() => {
    const sync = () => setStore(read());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const toggle = useCallback(async (id: string) => {
    const s = read();
    if (s[id]) delete s[id];
    else {
      await askPermission();
      s[id] = { nearby: true, remote: true };
    }
    write(s);
  }, []);
  const setOpt = useCallback((id: string, key: keyof FollowOpts, value: boolean) => {
    const s = read();
    if (s[id]) write({ ...s, [id]: { ...s[id]!, [key]: value } });
  }, []);
  const ids = Object.keys(store);
  return { ids, store, following: nodeId ? Boolean(store[nodeId]) : false, opts: nodeId ? (store[nodeId] ?? null) : null, toggle, setOpt };
}
