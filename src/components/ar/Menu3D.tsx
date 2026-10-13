import { dishImage } from "@/lib/dishes";
// The venue's menu as a slowly turning 3D ring of dish cards ("menu in 3D").
export function Menu3D({ items }: { items: { name: string; price: number; img?: string | undefined }[] }) {
  const list = items.slice(0, 8);
  const step = 360 / Math.max(list.length, 1);
  const radius = Math.max(80, list.length * 18);
  return (
    <section className="mt-6">
      <div className="relative mx-auto h-36 w-full max-w-sm overflow-hidden" style={{ perspective: "900px" }}>
        <div className="absolute left-1/2 top-3 h-[6.2rem] w-32 -ml-16 aura-ring3d" style={{ transformStyle: "preserve-3d" }}>
          {list.map((m, i) => (
            <div key={m.name} className="absolute inset-0 flex flex-col items-center justify-between overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-b from-white/95 to-slate-100/95 p-1.5 text-center text-slate-900 shadow-xl" style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)`, backfaceVisibility: "hidden" }}>
              <img src={dishImage(m)} alt="" className="h-11 w-auto object-contain drop-shadow" />
              <span className="line-clamp-1 text-[0.68rem] font-bold leading-tight">{m.name.replace(/\s*\(esempio\)/i, "")}</span>
              <span className="text-[0.7rem] font-semibold text-slate-600">€ {m.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
