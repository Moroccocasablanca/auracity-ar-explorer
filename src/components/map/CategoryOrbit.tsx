import { useEffect, useState } from "react";
import { Ico, type IcoName } from "@/components/Ico";

export type OrbitItem = { key: string; label: string; icon: IcoName };

/**
 * One button with the chosen category; touch it and ALL the categories pop out at once in a small panel, each with its picture and name:
 * nothing turns, nothing to wait for, and the map stays visible below.
 */
export function CategoryOrbit({ items, value, onChange }: { items: OrbitItem[]; value: string; onChange: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const cur = items.find((i) => i.key === value) ?? items[0];

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest?.("[data-orbit]")) setOpen(false); };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, [open]);

  return (
    <>
      <button
        type="button"
        data-orbit
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={cur?.label}
        className="relative flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/15 bg-card/80 px-3 text-left shadow-lg transition active:scale-95"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10">{cur && <Ico n={cur.icon} className="size-8" />}</span>
        <span className="min-w-0 flex-1 truncate text-[0.95rem] font-extrabold">{cur?.label}</span>
        <span aria-hidden className={`text-xs text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && (
        <div data-orbit role="menu" className="cat-fan absolute inset-x-2 top-full z-20 mt-1 grid grid-cols-5 gap-1 rounded-3xl border border-white/15 bg-card/95 p-2 shadow-2xl">
          {items.map((it, i) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              onClick={() => { if (it.key !== value) onChange(it.key); setOpen(false); }}
              style={{ ["--i" as string]: i }}
              className={`cat-pop flex flex-col items-center justify-start gap-0.5 rounded-2xl px-0.5 py-1.5 transition active:scale-90 ${it.key === value ? "bg-cyan-400/25 ring-1 ring-cyan-300/70" : "active:bg-white/10"}`}
            >
              <Ico n={it.icon} className="size-9" />
              <span className="line-clamp-2 text-center text-[0.62rem] font-bold leading-tight">{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
