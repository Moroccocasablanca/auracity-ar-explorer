// Test mode: lets the owner leave a message on a talking tree or bench from this phone without the server.
import { useEffect, useState } from "react";

const KEY = "aura_local_messages";
const EVENT = "aura-local-msg";
export type LocalMessage = { id: string; node_id: string; body: string; created_at: string };

const all = (): LocalMessage[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as LocalMessage[];
  } catch {
    return [];
  }
};

export function addLocalMessage(nodeId: string, body: string) {
  const m: LocalMessage = { id: `local-${Date.now()}`, node_id: nodeId, body, created_at: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify([m, ...all()].slice(0, 100)));
  window.dispatchEvent(new Event(EVENT));
}

/** Messages left in test mode on a node (newest first, only the last 48 hours like the real ones). */
export function useLocalMessages(nodeId: string): LocalMessage[] {
  const [list, setList] = useState<LocalMessage[]>([]);
  useEffect(() => {
    const read = () => setList(all().filter((m) => m.node_id === nodeId && Date.now() - Date.parse(m.created_at) < 48 * 3600_000));
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, [nodeId]);
  return list;
}
