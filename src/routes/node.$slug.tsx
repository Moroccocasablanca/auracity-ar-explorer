import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ListenButton } from "@/components/ListenButton";
import { refreshMenu } from "@/lib/auracity.functions";
import { ArrowLeft, Clock, Landmark, MapPin, Sparkles, Tag } from "lucide-react";
import { MessageBoard, PresenceBanner, ReviewBoard, usePresence } from "@/components/NodeInteractions";
import { isOpenNow, formatDistance } from "@/lib/geo";
import { kindKey, useI18n } from "@/lib/i18n";
import { description, history, nodeHours, nodeMenu, nodesQuery, promo, specials, tagline, type NodeRow } from "@/lib/nodes";
import { allowsMessages, isGardenObject } from "@/lib/node-rules";
import { GardenCharacter } from "@/components/GardenCharacter";

export const Route = createFileRoute("/node/$slug")({
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ");
    return {
      meta: [
        { title: `${name} — AURACITY node in Bra` },
        { name: "description", content: `Interactive AR node "${name}" in Bra: messages, reviews and local info.` },
        { property: "og:title", content: `${name} — AURACITY node in Bra` },
        { property: "og:description", content: `Interactive AR node "${name}" in Bra.` },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: NodePage,
});

function NodePage() {
  const { slug } = Route.useParams();
  const { t } = useI18n();
  const { data: nodes = [], isLoading } = useQuery(nodesQuery);
  const node = nodes.find((n) => n.slug === slug);
  const [tab, setTab] = useState<"messages" | "reviews">("messages");

  if (isLoading) return <div className="min-h-screen" />;
  if (!node) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <p className="text-muted-foreground">{t("err.not_found")}</p>
        <Link to="/explore" className="text-primary underline">
          {t("node.back")}
        </Link>
      </div>
    );
  }
  return <NodeDetail node={node} tab={tab} setTab={setTab} />;
}

function NodeDetail({
  node,
  tab,
  setTab,
}: {
  node: NodeRow;
  tab: "messages" | "reviews";
  setTab: (t: "messages" | "reviews") => void;
}) {
  const { t, lang } = useI18n();
  const { dist, inRange } = usePresence(node);
  const hours = nodeHours(node);
  const open = isOpenNow(hours);
  const menu = nodeMenu(node);
  const offer = promo(node, lang);
  const isBiz = node.kind === "business";
  const isMonument = node.kind === "monument";
  const story = history(node, lang);
  const todaySpecials = specials(node, lang);
  const qc = useQueryClient();
  const refresh = useServerFn(refreshMenu);

  // Menus update themselves: the server re-reads the venue's page once per day.
  useEffect(() => {
    if (!isBiz || !node.menu_source_url) return;
    refresh({ data: { nodeId: node.id } })
      .then((r) => {
        if (r.updated) void qc.invalidateQueries({ queryKey: ["nodes"] });
      })
      .catch(() => {});
  }, [isBiz, node.id, node.menu_source_url, refresh, qc]);

  return (
    <div className={`kind-${node.kind} mx-auto min-h-screen max-w-xl px-4 pb-32 pt-6`}>
      <Link to="/explore" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("node.back")}
      </Link>

      {node.image_url && (
        <figure className="mt-5 overflow-hidden rounded-2xl border border-border">
          <img src={node.image_url} alt={node.name} className="aspect-[4/3] w-full object-cover" />
          {node.image_credit && (
            <figcaption className="mono-label bg-card/80 px-3 py-1.5 !text-[0.55rem]">
              {t("node.photo")}: {node.image_credit}
            </figcaption>
          )}
        </figure>
      )}

      <header className="mt-5">
        <p className="mono-label" style={{ color: "var(--kind)" }}>
          {t(kindKey(node.kind))}
        </p>
        <h1 className="mt-1 text-4xl font-bold">{node.name}</h1>
        <p className="mt-1 text-muted-foreground">{tagline(node, lang)}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5">
            <MapPin className="size-3.5" /> {node.address}
          </span>
          {dist != null && (
            <span className="glass rounded-full px-3 py-1.5 font-mono">
              {t("node.distance")}: {formatDistance(dist)}
            </span>
          )}
          {isBiz && hours && (
            <span
              className={`glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${open ? "text-success" : "text-destructive"}`}
            >
              <Clock className="size-3.5" />
              {open ? t("node.open") : t("node.closed")} · {hours.open}–{hours.close}
            </span>
          )}
        </div>
      </header>

      <p className="mt-6 leading-relaxed text-foreground/90">{description(node, lang)}</p>

      {!allowsMessages(node) && (story || description(node, lang)) && (
        <section className="kind-ring mt-6 rounded-2xl border bg-card/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="mono-label inline-flex items-center gap-2" style={{ color: "var(--kind)" }}>
              <Landmark className="size-4" /> {t("node.history")}
            </h2>
            <ListenButton text={`${node.name}. ${story || description(node, lang)}`} />
          </div>
          {story && <p className="mt-3 leading-relaxed text-foreground/90">{story}</p>}
        </section>
      )}

      {isBiz && todaySpecials && (
        <div className="kind-ring mt-6 flex items-start gap-3 rounded-2xl border bg-card/60 p-4">
          <Sparkles className="mt-0.5 size-5 shrink-0" style={{ color: "var(--kind)" }} />
          <div>
            <p className="mono-label !text-[0.6rem]" style={{ color: "var(--kind)" }}>
              {t("node.specials")}
            </p>
            <p className="mt-0.5">{todaySpecials}</p>
          </div>
        </div>
      )}

      {offer && (
        <div className="kind-ring mt-6 flex items-start gap-3 rounded-2xl border border-dashed bg-card/60 p-4">
          <Tag className="mt-0.5 size-5 shrink-0" style={{ color: "var(--kind)" }} />
          <div>
            <p className="mono-label !text-[0.6rem]" style={{ color: "var(--kind)" }}>
              {t("node.promo")}
            </p>
            <p className="mt-0.5 font-medium">{offer}</p>
          </div>
        </div>
      )}

      {menu.length > 0 && (
        <section className="mt-6">
          <h2 className="mono-label mb-2">{t("node.menu")}</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card/60">
            {menu.map((m) => (
              <li key={m.name} className="flex justify-between px-4 py-3 text-sm">
                <span>{m.name}</span>
                <span className="font-mono text-muted-foreground">€ {m.price.toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            {node.menu_source_url && node.menu_updated_at
              ? t("node.menu.auto", {
                  d: new Date(node.menu_updated_at).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB"),
                })
              : t("node.menu.manual")}
          </p>
        </section>
      )}

      {allowsMessages(node) && <section className="mt-8 space-y-4">
        {isGardenObject(node) && <GardenCharacter node={node} />}
        <PresenceBanner node={node} dist={dist} inRange={inRange} />
        <div className="glass flex rounded-full p-1">
          {(["messages", ...(isBiz ? (["reviews"] as const) : [])] as ("messages" | "reviews")[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                tab === k || (!isBiz && k === "messages") ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t(k === "messages" ? "node.messages" : "node.reviews")}
            </button>
          ))}
        </div>
        {isBiz && tab === "reviews" ? <ReviewBoard node={node} /> : <MessageBoard node={node} />}
      </section>}
    </div>
  );
}
