import { useEffect, useRef, type ReactNode } from "react";

/**
 * A row of buttons that reacts to the finger like a living surface: the icons swell and rise around the touch,
 * the whole bar leans towards it and a light follows it. Slide the finger along it and let go on a button to pick it.
 */
export function MagnetDock({ children, className = "", strength = 0.75, reach = 64, onHover, onDragPick }: { children: ReactNode; className?: string; strength?: number; reach?: number; onHover?: (i: number | null) => void; onDragPick?: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef({ onHover, onDragPick });
  cb.current = { onHover, onDragPick };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let down = false;
    let startX = 0;
    let moved = false;
    let last = -1;
    const kids = () => Array.from(el.children).filter((c): c is HTMLElement => c instanceof HTMLElement && c.dataset["dockSkip"] == null);
    const centers = () => kids().map((c) => c.offsetLeft + c.offsetWidth / 2);

    const apply = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      const x = clientX - r.left;
      const cs = centers();
      let best = 0;
      kids().forEach((c, i) => {
        const dx = x - cs[i]!;
        if (Math.abs(dx) < Math.abs(x - cs[best]!)) best = i;
        const s = 1 + strength * Math.exp(-((dx / reach) ** 2));
        c.style.transition = "transform .08s linear";
        c.style.transform = `translateY(${(-(s - 1) * 26).toFixed(1)}px) scale(${s.toFixed(3)})`;
        c.style.zIndex = String(Math.round(s * 10));
      });
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${clientY - r.top}px`);
      el.style.setProperty("--glow", "1");
      el.style.transition = "transform .1s linear";
      el.style.transform = `perspective(520px) rotateY(${(((x / r.width) - 0.5) * 16).toFixed(1)}deg) rotateX(${(down ? 5 : 0)}deg)`;
      if (best !== last) { last = best; cb.current.onHover?.(best); }
    };
    const rest = () => {
      kids().forEach((c) => { c.style.transition = "transform .6s cubic-bezier(.2,1.8,.4,1)"; c.style.transform = ""; c.style.zIndex = ""; });
      el.style.transition = "transform .6s cubic-bezier(.2,1.8,.4,1)";
      el.style.transform = "";
      el.style.setProperty("--glow", "0");
      last = -1;
      cb.current.onHover?.(null);
    };

    const onDown = (e: PointerEvent) => { down = true; moved = false; startX = e.clientX; apply(e.clientX, e.clientY); };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") apply(e.clientX, e.clientY);
      void startX;
    };
    const onUp = (e: PointerEvent) => {
      if (down && moved && last >= 0) {
        cb.current.onDragPick?.(last);
        const stop = (ev: Event) => { ev.preventDefault(); ev.stopPropagation(); };
        el.addEventListener("click", stop, { capture: true, once: true });
        setTimeout(() => el.removeEventListener("click", stop, { capture: true }), 400);
      }
      down = false;
      void e;
      rest();
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onUp);
    };
  }, [strength, reach]);

  return (
    <div ref={ref} className={`magnet-dock ${className}`} style={{ touchAction: "manipulation" }}>
      {children}
    </div>
  );
}
