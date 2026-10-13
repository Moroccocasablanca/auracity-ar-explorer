// The venue's menu as a slowly turning 3D ring of dish cards ("menu in 3D").
export function Menu3D({ items }: { items: { name: string; price: number }[] }) {
  const list = items.slice(0, 8);
  const step = 360 / Math.max(list.length, 1);
  const radius = Math.max(120, list.length * 26);
  return (
    <section className="mt-6">
      <div className="relative mx-auto h-44 w-full max-w-sm overflow-hidden" style={{ perspective: "700px" }}>
        <div className="absolute left-1/2 top-4 h-28 w-40 -ml-20 aura-ring3d" style={{ transformStyle: "preserve-3d" }}>
          {list.map((m, i) => (
            <div key={m.name} className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-white/30 bg-gradient-to-br from-orange-400/90 to-pink-500/90 p-2 text-center text-white shadow-xl" style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)`, backfaceVisibility: "hidden" }}>
              <span className="text-sm font-bold leading-tight">{m.name.replace(/\s*\(esempio\)/i, "")}</span>
              <span className="mt-1 font-mono text-xs">€ {m.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
