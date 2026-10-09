import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { distanceM, formatDistance } from "@/lib/geo";
import { kindKey, useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { KINDS, nodesQuery, tagline, type NodeKind } from "@/lib/nodes";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore Bra — AURACITY nodes" },
      {
        name: "description",
        content: "Browse every street, monument and business of Bra mapped as an AURACITY augmented-reality node.",
      },
      { property: "og:title", content: "Explore Bra — AURACITY nodes" },
      {
        property: "og:description",
        content: "Browse every street, monument and business of Bra mapped as an AURACITY augmented-reality node.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Explore,
});

function Explore() {
  const { t, lang } = useI18n();
  const { pos } = useLocation();
  const { data: nodes = [] } = useQuery(nodesQuery);
  const [kind, setKind] = useState<NodeKind | "all">("all");

  const list = useMemo(() => {
    return nodes
      .filter((n) => kind === "all" || n.kind === kind)
      .map((n) => ({ n, d: pos ? distanceM(pos, n) : null }))
      .sort((a, b) => (a.d != null && b.d != null ? a.d - b.d : a.n.name.localeCompare(b.n.name)));
  }, [nodes, kind, pos]);

  return (
    <div className="grid-backdrop min-h-screen px-4 pb-32 pt-10">
      <div className="mx-auto max-w-xl">
        <p className="mono-label">Bra · Piemonte</p>
        <h1 className="mt-1 text-4xl font-bold">{t("explore.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("explore.sub")}</p>

        <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1">
          {(["all", ...KINDS] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`kind-${k === "all" ? "service" : k} shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                kind === k
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "all" ? t("all") : t(kindKey(k))}
            </button>
          ))}
        </div>

        <ul className="mt-6 space-y-3">
          {list.map(({ n, d }) => (
            <li key={n.id} className={`kind-${n.kind}`}>
              <Link
                to="/node/$slug"
                params={{ slug: n.slug }}
                className="glass group flex items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-accent/40"
              >
                <span className="kind-dot size-3 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <p className="mono-label !text-[0.58rem]" style={{ color: "var(--kind)" }}>
                    {t(kindKey(n.kind))}
                  </p>
                  <p className="truncate font-semibold">{n.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{tagline(n, lang)}</p>
                </div>
                {d != null && <span className="font-mono text-xs text-muted-foreground">{formatDistance(d)}</span>}
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
