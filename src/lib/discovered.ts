// Personal collection of talking garden objects found on site, kept on the phone only.
const KEY = "aura_discovered";

export function discovered(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function markDiscovered(id: string) {
  const list = discovered();
  if (!list.includes(id)) localStorage.setItem(KEY, JSON.stringify([...list, id]));
}
