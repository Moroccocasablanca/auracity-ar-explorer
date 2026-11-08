import { useRef, useState, type PointerEvent } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { Ico, type IcoName } from "@/components/Ico";

// Order: the map first, then the camera, the guide, the adventure and the account (language and "for venues" are inside Account).
const items = [
  { to: "/explore", key: "nav.explore", icon: "world_map" as IcoName },
  { to: "/", key: "nav.ar", icon: "camera_with_flash" as IcoName },
  { to: "/guide", key: "nav.guide", icon: "speech_balloon" as IcoName },
  { to: "/quest", key: "nav.quest", icon: "compass" as IcoName },
  { to: "/auth", key: "nav.account", icon: "smiling_face_with_sunglasses" as IcoName },
] as const;
const LIFT = [10, 4, 0, 4, 10]; // the crystals follow a soft arch

/** Floating glass crystals on an arch: each leans towards the finger in 3D and, when chosen, sends out a ring of light. */
export function BottomNav() {
  const { t } = useI18n();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const at = Math.max(0, items.findIndex((i) => (i.to === "/" ? path === "/" : path.startsWith(i.to))));
  const [burst, setBurst] = useState<{ i: number; n: number } | null>(null);
  const press = useRef<HTMLElement | null>(null);

  const lean = (e: PointerEvent<HTMLElement>) => {
    const el = e.currentTarget.firstElementChild as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    press.current = el;
    el.style.transition = "transform .06s linear";
    el.style.transform = `perspective(260px) rotateY(${(x * 46).toFixed(1)}deg) rotateX(${(-y * 46).toFixed(1)}deg) scale(.9)`;
  };
  const release = () => {
    const el = press.current;
    if (!el) return;
    el.style.transition = "transform .55s cubic-bezier(.2,1.9,.4,1)";
    el.style.transform = "";
    press.current = null;
  };

  return (
    <nav className="aura-nav pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-5">
      <div className="pointer-events-auto flex w-full max-w-md items-end justify-between px-3">
        {items.map(({ to, key, icon }, i) => {
          const on = i === at;
          return (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              onPointerDown={lean}
              onPointerUp={release}
              onPointerCancel={release}
              onPointerLeave={release}
              onClick={() => setBurst({ i, n: Date.now() })}
              className="relative flex w-[4.1rem] flex-col items-center gap-1"
              style={{ marginBottom: LIFT[i]! + (on ? 6 : 0), transition: "margin .5s cubic-bezier(.3,1.7,.4,1)" }}
            >
              <span className={`aura-crystal relative flex size-[3rem] items-center justify-center rounded-[1.1rem] ${on ? "is-on" : ""}`} style={{ ["--d" as string]: `${i * 0.45}s` }}>
                <Ico n={icon} className="size-8" />
                {burst?.i === i && <span key={burst.n} aria-hidden className="aura-burst" />}
              </span>
              <span className={`text-[0.64rem] font-bold tracking-wide ${on ? "text-cyan-200" : "text-white/75"}`} style={{ textShadow: "0 1px 6px #000" }}>{t(key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
