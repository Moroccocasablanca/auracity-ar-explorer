// The visitor's own face on the map ("You are here"): a ready-made avatar or their own photo.
// Kept on this phone; it is shown only to the person themselves.
import { useEffect, useState } from "react";

export type MyAvatar = { kind: "default" } | { kind: "emoji"; value: string } | { kind: "photo"; value: string };
/** Ready-made characters (made with AI, modern 3D look). The user can always use their own photo instead. */
export const AVATARS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `/avatars/a${n}.jpg`);
/** Colour of the ring around you on the map. */
export const RINGS = ["#22d3ee", "#a78bfa", "#f472b6", "#fb923c", "#facc15", "#4ade80", "#f8fafc", "#f43f5e"];

const KEY = "aura_my_avatar";
const EVENT = "aura-avatar";

export function getAvatar(): MyAvatar {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as MyAvatar | null;
    if (v && (v.kind === "emoji" || v.kind === "photo") && typeof v.value === "string") return v;
  } catch {
    /* ignore */
  }
  return { kind: "default" };
}

export function setAvatar(a: MyAvatar) {
  try {
    if (a.kind === "default") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* storage full or blocked */
  }
  window.dispatchEvent(new Event(EVENT));
}

const RING_KEY = "aura_my_ring";
export const getRing = () => {
  try { return localStorage.getItem(RING_KEY) || RINGS[0]!; } catch { return RINGS[0]!; }
};
export function setRing(c: string) {
  try { localStorage.setItem(RING_KEY, c); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT));
}
export function useRing(): string {
  const [c, setC] = useState(RINGS[0]!);
  useEffect(() => {
    const read = () => setC(getRing());
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, []);
  return c;
}

export function useAvatar(): MyAvatar {
  const [a, setA] = useState<MyAvatar>({ kind: "default" });
  useEffect(() => {
    const read = () => setA(getAvatar());
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, []);
  return a;
}

/** Crops the picture to a centred square and shrinks it (about 10 KB), so it fits on the phone and loads instantly. */
export function photoToAvatar(file: File, size = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}
