// When you stand near a bar or restaurant with the camera open, its mascot greets you, reads today's offer and menu aloud
// and shows the menu as a turning 3D ring in front of the shop.
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Volume2, X } from "lucide-react";
import { Menu3D } from "@/components/Menu3D";
import { getNick, setNick } from "@/lib/leaderboard";
import { useI18n } from "@/lib/i18n";
import { bump, useFlash } from "@/lib/merchant";
import { inviteBody } from "@/lib/invites";
import { nodeMenu, specials, type NodeRow } from "@/lib/nodes";
import { placeStyleKey } from "@/lib/place-style";
import { speakAny, stopSpeaking } from "@/lib/speech";
import { contentLang } from "@/lib/text-speech";
import { useVenueContent } from "@/lib/venue-content";
import { VoicePersona } from "@/lib/voice-persona";

const greeted = new Set<string>(); // each venue greets once per visit to the app

export function VenueGreeter({ node, onClose }: { node: NodeRow; onClose: () => void }) {
  const { t, lang } = useI18n();
  const vc = useVenueContent(node);
  const flash = useFlash(node.id);
  const [talking, setTalking] = useState(false);
  const [who, setWho] = useState(() => (typeof localStorage === "undefined" ? "" : getNick()));
  const [draft, setDraft] = useState("");
  const name = node.name.split(" · ")[0]!;
  const menu = vc.menu?.length ? vc.menu : nodeMenu(node);
  const today = vc.specials ?? specials(node, lang);
  const offer = vc.offer;

  const script = useMemo(() => {
    const items = menu.slice(0, 5).map((m) => m.name.replace(/\s*\(esempio\)/i, "")).join(", ");
    return [
      who ? t("greet.hello.name", { who, name }) : t("greet.hello", { name }),
      flash ? `${t("flash.title")}: ${flash.rawTextFromOwner}.` : "",
      today ? `${t("node.specials")}: ${today}.` : "",
      offer ? `${offer}.` : "",
      items ? t("greet.menu", { items }) : "",
      inviteBody(node, lang, t("prox.invite.default")),
    ].filter(Boolean).join(" ");
  }, [t, name, who, flash, today, offer, menu, node, lang]);

  const say = () => {
    stopSpeaking();
    setTalking(true);
    void speakAny(script, contentLang(lang), () => setTalking(false), VoicePersona.BUSINESS_USER, vc.voice);
  };

  useEffect(() => {
    bump(node.id, "totalArViews");
    if (!greeted.has(node.id)) {
      greeted.add(node.id);
      const id = window.setTimeout(say, 900);
      return () => window.clearTimeout(id);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);
  useEffect(() => () => stopSpeaking(), []);

  return (
    <div className="glass absolute inset-x-3 bottom-24 z-30 mx-auto max-w-md rounded-3xl p-4" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" aria-label={t("greet.close")} onClick={() => { stopSpeaking(); onClose(); }} className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground">
        <X className="size-4" />
      </button>
      <div className="flex items-center gap-3">
        <img
          src={placeStyleKey(node) === "restaurant" ? "/mascots/chef.png" : "/mascots/barista.png"}
          alt=""
          className={`h-40 w-auto shrink-0 drop-shadow-xl ${talking ? "mascot-talk" : "mascot-idle"}`}
        />
        <div className="min-w-0 pr-6">
          <p className="mono-label !text-[0.6rem]" style={{ color: "var(--primary)" }}>{t("greet.here")}</p>
          <p className="truncate text-lg font-bold leading-tight">{name}</p>
          <p className="mt-1 text-sm leading-snug text-foreground/90">{flash ? `⚡ ${flash.rawTextFromOwner}` : today || offer || t("greet.hello", { name })}</p>
        </div>
      </div>
      {!who && (
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = draft.trim().slice(0, 20); if (v) { setNick(v); setWho(v); } }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("greet.name.ph")} className="min-w-0 flex-1 rounded-full border border-border bg-background/70 px-4 py-2 text-sm" />
          <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{t("greet.name.ok")}</button>
        </form>
      )}
      {menu.length > 0 && <Menu3D items={menu} />}
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={talking ? () => { stopSpeaking(); setTalking(false); } : say} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-sm font-semibold">
          <Volume2 className="size-4" /> {talking ? t("audio.stop") : t("audio.listen")}
        </button>
        <Link to="/node/$slug" params={{ slug: node.slug }} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          {t("ar.open")} <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
