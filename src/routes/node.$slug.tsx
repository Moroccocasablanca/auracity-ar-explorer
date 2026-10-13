import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ListenButton } from "@/components/ListenButton";
import { refreshMenu } from "@/lib/auracity.functions";
import { ArrowLeft, Clock, Landmark, MapPin, Sparkles, Tag, Zap } from "lucide-react";
import { MessageBoard, PresenceBanner, ReviewBoard, usePresence } from "@/components/NodeInteractions";
import { isOpenNow, formatDistance } from "@/utils/geo";
import { kindKey, LOCALE_TAG, useI18n } from "@/lib/i18n";
import { useNodeText } from "@/services/translate/use-node-text";
import { logEvent } from "@/lib/quest";
import { nameLanguage, nameThenText } from "@/services/voice/text-speech";
import { VenueAvatar } from "@/components/ar/VenueAvatar";
import { VoicePersona } from "@/services/voice/voice-persona";
import { MonumentModel } from "@/components/ar/MonumentOverlay";
import { STORY_SOURCES } from "@/data/story-sources";
import { placeStyleKey } from "@/lib/place-style";
import { useVenueContent } from "@/lib/venue-content";
import { useFollowing } from "@/services/notifications/follow";
import { bump, useFlash } from "@/lib/merchant";
import { Menu3D } from "@/components/ar/Menu3D";
import { dishImage } from "@/lib/dishes";
import { speakAny, stopSpeaking } from "@/services/voice/speech";
import { contentLang } from "@/services/voice/text-speech";
import { nodeHours, nodeMenu, nodesQuery, shortStory, specials, type NodeRow } from "@/lib/nodes";
import { allowsMessages, isGardenObject } from "@/lib/node-rules";
import { GardenCharacter } from "@/components/ar/GardenCharacter";
import { venueFeaturesEnabled } from "@/config/systemConfig";

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
  // Visiting a restaurant in person (within 100 m) earns a passport stamp.
  useEffect(() => {
    if (node.kind === "business" && dist != null && dist <= 100) logEvent("stamp", node.id);
  }, [node.kind, node.id, dist]);
  const hours = nodeHours(node);
  const open = isOpenNow(hours);
  const vc = useVenueContent(node);
  const menu = vc.menu?.length ? vc.menu : nodeMenu(node);
  const [talking, setTalking] = useState(false);
  const follow = useFollowing(node.id);
  const flash = useFlash(node.id);
  const [redeemed, setRedeemed] = useState(false);
  const tx = useNodeText(node);
  const offer = vc.offer ?? tx.promo;
  const isBiz = node.kind === "business" && venueFeaturesEnabled(node.subscribed);
  const unclaimed = node.kind === "business" && !venueFeaturesEnabled(node.subscribed);
  const story = tx.history;
  const verifiedLinks = Array.isArray(node.history_sources) ? node.history_sources.filter((url): url is string => typeof url === "string" && /^https?:\/\//.test(url)) : [];
  const sourceLinks = verifiedLinks.length > 0 ? verifiedLinks : (STORY_SOURCES[node.slug] ?? []);
  const unverified = verifiedLinks.length === 0;
  const todaySpecials = vc.specials ?? specials(node, lang);
  const tellVenue = () => {
    if (talking) { stopSpeaking(); setTalking(false); return; }
    const body = [todaySpecials, offer, menu.length ? `${t("node.menu")}: ${menu.slice(0, 5).map((m) => m.name.replace(/\s*\(esempio\)/i, "")).join(", ")}` : ""].filter(Boolean).join(". ");
    setTalking(true);
    void speakAny(nameThenText(node.name, body || t("prox.invite.default"), contentLang(lang), nameLanguage(node.name, node.kind)), contentLang(lang), () => setTalking(false), VoicePersona.BUSINESS_USER, vc.voice);
  };
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
        <h1 className="mt-1 text-4xl font-bold">{tx.name}</h1>
        <p className="mt-1 text-muted-foreground">{tx.tagline}</p>
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

      <p className="mt-6 leading-relaxed text-foreground/90">{tx.description}</p>

      {node.kind === "monument" && (
        <section className="mt-6 border-y border-border py-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="mono-label inline-flex items-center gap-2" style={{ color: "var(--kind)" }}>
              <Landmark className="size-4" /> {t("node.history")}
            </h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <ListenButton text={nameThenText(node.name, shortStory(story || tx.description), tx.speakLang)} voice={{ nodeId: node.id, source: "history", lang: tx.speakLang, persona: VoicePersona.MONUMENT_FEMALE }} />
              {story && story.length > 260 && (
                <ListenButton text={nameThenText(node.name, story, tx.speakLang)} voice={{ nodeId: node.id, source: "history", full: true, lang: tx.speakLang, persona: VoicePersona.MONUMENT_FEMALE }} label={t("audio.more")} />
              )}
            </div>
          </div>
          {story ? (
            <>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-foreground/90">{shortStory(story)}</p>
              {story.length > shortStory(story).length + 5 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-primary">{t("node.readmore")}</summary>
                  <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground/90">{story}</p>
                </details>
              )}
            </>
          ) : <p className="mt-3 text-muted-foreground">{t("node.history.soon")}</p>}
          {story && unverified && <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">{t("node.unverified")}</p>}
          {sourceLinks.length > 0 && <details className="mt-4 text-sm text-muted-foreground">
            <summary className="cursor-pointer">{t("node.sources")}</summary>
            <ul className="mt-2 space-y-2">{sourceLinks.map((url) => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline">{new URL(url).hostname.replace(/^www\./, "")}</a></li>)}</ul>
          </details>}
        </section>
      )}

      {node.kind === "business" && (
        <div className="mt-6 flex items-center gap-4 rounded-3xl border border-border bg-card/60 p-4">
          <VenueAvatar style={placeStyleKey(node)} speaking={talking} size={92} />
          <div className="min-w-0 flex-1">
            <p className="mono-label !text-[0.6rem]">{t("venue.avatar")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("venue.avatar.sub")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={tellVenue} className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">{talking ? t("audio.stop") : t("venue.avatar.talk")}</button>
              <button type="button" onClick={() => void follow.toggle(node.id)} className={`rounded-full border px-4 py-2 text-sm font-bold ${follow.following ? "border-green-400 bg-green-400/15 text-green-200" : "border-border"}`}>{follow.following ? "✓ " + t("follow.on") : t("follow.off")}</button>
            </div>
            {follow.following && follow.opts ? (
              <div className="mt-2 space-y-1.5 rounded-xl border border-border p-2.5">
                <label className="flex items-center justify-between gap-3 text-xs"><span>{t("follow.nearby")}</span><input type="checkbox" checked={follow.opts.nearby} onChange={(e) => follow.setOpt(node.id, "nearby", e.target.checked)} className="size-5" /></label>
                <label className="flex items-center justify-between gap-3 text-xs"><span>{t("follow.remote")}</span><input type="checkbox" checked={follow.opts.remote} onChange={(e) => follow.setOpt(node.id, "remote", e.target.checked)} className="size-5" /></label>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">{t("follow.help")}</p>
            )}
          </div>
        </div>
      )}

      {flash && (
        <div className="mt-6 rounded-3xl border-2 border-yellow-300 bg-gradient-to-r from-yellow-300/25 to-pink-400/20 p-4">
          <p className="mono-label !text-[0.65rem]" style={{ color: "#fde047" }}><Zap className="mr-1 inline size-3.5" />{t("flash.title")} · {t("flash.left", { m: flash.minutesLeft })}</p>
          <p className="mt-1 text-xl font-bold leading-snug">{flash.headline ?? flash.rawTextFromOwner}</p>{flash.headline && <p className="text-sm text-foreground/80">{flash.rawTextFromOwner}</p>}
          <button type="button" disabled={redeemed} onClick={() => { bump(node.id, "promosRedeemed"); setRedeemed(true); }} className="mt-3 rounded-full bg-yellow-300 px-5 py-2.5 text-sm font-extrabold text-black disabled:opacity-60">{redeemed ? "✓ " + t("flash.redeemed") : t("flash.redeem")}</button>
        </div>
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

      {menu.length > 0 && vc.has3DMenu && <Menu3D items={menu} />}

      {menu.length > 0 && (
        <section className="mt-6">
          <h2 className="mono-label mb-2">{t("node.menu")}</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card/60">
            {menu.map((m) => (
              <li key={m.name} className="flex items-center gap-3 px-3 py-2 text-sm">
                <img src={dishImage(m)} alt="" loading="lazy" className="size-14 shrink-0 rounded-2xl bg-gradient-to-br from-white/90 to-slate-200/80 object-contain p-1 shadow-sm" />
                <span className="flex-1 font-medium">{m.name}</span>
                <span className="font-semibold text-muted-foreground">€ {m.price.toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            {vc.menu?.length
              ? t("venue.example")
              : node.menu_source_url && node.menu_updated_at
              ? t("node.menu.auto", {
                  d: new Date(node.menu_updated_at).toLocaleDateString(LOCALE_TAG[lang]),
                })
              : t("node.menu.manual")}
          </p>
        </section>
      )}

      {unclaimed && (
        <Link to="/business" className="glass mt-6 block rounded-2xl px-4 py-3 text-sm">
          <span className="font-medium text-foreground">{t("venue.claim.title")}</span>
          <span className="mt-0.5 block text-muted-foreground">{t("venue.claim.body")}</span>
        </Link>
      )}

      {vc.reviews && vc.reviews.length > 0 && (
        <section className="mt-6">
          <h2 className="mono-label mb-2">{t("venue.reviews.verified")}</h2>
          <ul className="space-y-2">
            {vc.reviews.map((r) => (
              <li key={r.author + r.when} className="rounded-2xl border border-border bg-card/60 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <b>{r.author}</b>
                  <span className="text-yellow-300">{"★".repeat(r.stars)}<span className="text-muted-foreground">{"★".repeat(5 - r.stars)}</span></span>
                </div>
                <p className="mt-1">{r.body}</p>
                <button type="button" className="mt-1 text-xs font-semibold text-primary" onClick={() => { bump(node.id, "voiceReviewsListened"); void speakAny(`${r.author}: ${r.body}`, contentLang(lang)); }}>🔊 {t("audio.listen")}</button>
                <p className="mt-1 flex items-center gap-1 text-xs text-green-300">✓ {t("venue.verified")} · <span className="text-muted-foreground">{r.when}</span></p>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">{t("venue.reviews.how")}</p>
        </section>
      )}

      {allowsMessages(node) && <section className="mt-8 space-y-4">
        {isGardenObject(node) && <GardenCharacter node={node} inRange={inRange} />}
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
