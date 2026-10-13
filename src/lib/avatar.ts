// The visitor's own face on the map ("You are here"): a ready-made avatar or their own photo.
// Kept on this phone; it is shown only to the person themselves.
import { useEffect, useState } from "react";

export type MyAvatar = { kind: "default" } | { kind: "emoji"; value: string } | { kind: "photo"; value: string };
export const EMOJIS = ["😀", "😎", "🤠", "🦊", "🐼", "🐱", "🐶", "🦄", "🚀", "⭐", "🍕", "🎸"];

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
