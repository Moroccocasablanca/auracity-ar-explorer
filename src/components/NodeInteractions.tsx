import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPinOff, Navigation, ScanLine, Star } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { postBenchMessage, postMessage, postReview, type ActionResult } from "@/lib/auracity.functions";
import { useSession } from "@/lib/auth";
import { ListenButton } from "./ListenButton";
import { distanceM, isOpenNow } from "@/lib/geo";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { messagesQuery, nodeHours, reviewsQuery, type NodeRow } from "@/lib/nodes";
import { QrScanner, canScanQr } from "./QrScanner";
import { isGardenObject } from "@/lib/node-rules";

const MAX_ACCURACY_M = 60;

function useAuthorName() {
  const [name, setName] = useState("");
  useEffect(() => setName(localStorage.getItem("aura_name") ?? ""), []);
  const update = (v: string) => {
    setName(v);
    localStorage.setItem("aura_name", v);
  };
  return [name, update] as const;
}

export function usePresence(node: NodeRow) {
  const loc = useLocation();
  const real = loc.active && !loc.demo && loc.pos != null;
  const dist = real && loc.pos ? distanceM(loc.pos, node) : null;
  const inRange = dist != null && dist <= node.radius_m && loc.accuracy <= MAX_ACCURACY_M;
  return { loc, dist, inRange };
}

export function PresenceBanner({ node, dist, inRange }: { node: NodeRow; dist: number | null; inRange: boolean }) {
  const { t } = useI18n();
  const { loc } = usePresence(node);
  let text: string;
  let tone = "text-muted-foreground";
  if (loc.demo) text = t("node.presence.demo");
  else if (dist == null) text = t("node.presence.nopos");
  else if (inRange) {
    text = t("node.presence.ok");
    tone = "text-success";
  } else {
    text = t("node.presence.far", { r: node.radius_m, d: `${Math.round(dist)} m` });
  }
  return (
    <div className={`glass flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${tone}`}>
      {inRange ? <Navigation className="size-4 shrink-0" /> : <MapPinOff className="size-4 shrink-0" />}
      <span className="flex-1">{text}</span>
      {!loc.active && (
        <button
          type="button"
          onClick={() => loc.start()}
          className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
        >
          {t("node.presence.enable")}
        </button>
      )}
    </div>
  );
}

function errorText(t: ReturnType<typeof useI18n>["t"], res: Extract<ActionResult, { ok: false }>) {
  return t(`err.${res.error}` as const, { d: res.distance ?? 0 });
}

const inputCls =
  "w-full rounded-xl border border-input bg-secondary/60 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary disabled:opacity-50";
const btnCls =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100";

function timeAgo(iso: string, lang: string) {
  return new Date(iso).toLocaleString(lang === "it" ? "it-IT" : "en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBoard({ node }: { node: NodeRow }) {
  const { t, lang } = useI18n();
  const { loc, inRange } = usePresence(node);
  const qc = useQueryClient();
  const sendPublic = useServerFn(postMessage);
  const sendBench = useServerFn(postBenchMessage);
  const isBench = isGardenObject(node);
  const send = isBench ? sendBench : sendPublic;
  const { session, ready } = useSession();
  const locked = isBench && ready && !session;
  const { data: messages = [] } = useQuery(messagesQuery(node.id));
  const [name, setName] = useAuthorName();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!loc.pos) return;
    setBusy(true);
    try {
      const res = await send({
        data: { nodeId: node.id, lat: loc.pos.lat, lng: loc.pos.lng, accuracy: loc.accuracy, author: name, body },
      });
      if (res.ok) {
        toast.success(t("form.sent"));
        setBody("");
        qc.invalidateQueries({ queryKey: ["messages", node.id] });
      } else toast.error(errorText(t, res));
    } catch {
      toast.error(t("err.unavailable"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {locked && (
        <div className="kind-ring flex items-center justify-between gap-3 rounded-xl border bg-card/60 px-3 py-2.5 text-sm">
          <span>{t("bench.login")}</span>
          <Link to="/auth" className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            {t("bench.loginCta")}
          </Link>
        </div>
      )}
      <div className="space-y-2">
        <input
          className={inputCls}
          placeholder={t("form.name")}
          value={name}
          maxLength={30}
          disabled={!inRange || busy || locked}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className={inputCls}
          rows={3}
          placeholder={t("form.message")}
          value={body}
          maxLength={280}
          disabled={!inRange || busy || locked}
          onChange={(e) => setBody(e.target.value)}
        />
        <button
          type="button"
          className={btnCls}
          disabled={!inRange || busy || locked || name.trim().length < 1 || body.trim().length < 2}
          onClick={submit}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {t("form.sending")}
            </>
          ) : (
            t("form.send")
          )}
        </button>
      </div>
      <ul className="space-y-2">
        {messages.length === 0 && <li className="text-sm text-muted-foreground">{t("messages.empty")}</li>}
        {messages.map((m) => (
          <li key={m.id} className="rounded-xl border border-border bg-card/60 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{t("privacy.visitor")}</span>
              <span className="mono-label !text-[0.58rem]">{timeAgo(m.created_at, lang)}</span>
            </div>
            <div className="mt-1 flex items-start gap-2">
              <p className="flex-1 text-sm text-foreground/90">{m.body}</p>
              <ListenButton compact text={m.body} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewBoard({ node }: { node: NodeRow }) {
  const { t, lang } = useI18n();
  const { loc, inRange } = usePresence(node);
  const qc = useQueryClient();
  const send = useServerFn(postReview);
  const { data: reviews = [] } = useQuery(reviewsQuery(node.id));
  const [name, setName] = useAuthorName();
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const tick = () => setOpen(isOpenNow(nodeHours(node)));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [node]);

  const onScan = useCallback((v: string) => {
    setCode(v.trim().toUpperCase());
    setScanning(false);
  }, []);

  const canWrite = inRange && open;

  async function submit() {
    if (!loc.pos) return;
    setBusy(true);
    try {
      const res = await send({
        data: {
          nodeId: node.id,
          lat: loc.pos.lat,
          lng: loc.pos.lng,
          accuracy: loc.accuracy,
          author: name,
          body,
          rating,
          receiptCode: code,
        },
      });
      if (res.ok) {
        toast.success(t("form.sent"));
        setBody("");
        setCode("");
        qc.invalidateQueries({ queryKey: ["reviews", node.id] });
      } else toast.error(errorText(t, res));
    } catch {
      toast.error(t("err.unavailable"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!open && (
        <div className="rounded-xl border border-kind-business/40 bg-kind-business/10 px-3 py-2.5 text-sm">
          {t("reviews.closed")}
        </div>
      )}
      <div className="space-y-2">
        <input
          className={inputCls}
          placeholder={t("form.name")}
          value={name}
          maxLength={30}
          disabled={!canWrite || busy}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex items-center gap-1" aria-label={t("form.rating")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={!canWrite || busy}
              onClick={() => setRating(n)}
              aria-label={`${n}`}
              className="p-1 disabled:opacity-50"
            >
              <Star className={`size-6 ${n <= rating ? "fill-kind-business text-kind-business" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
        <textarea
          className={inputCls}
          rows={3}
          placeholder={t("form.review")}
          value={body}
          maxLength={500}
          disabled={!canWrite || busy}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            className={`${inputCls} font-mono uppercase`}
            placeholder={t("form.receipt")}
            value={code}
            maxLength={40}
            disabled={!canWrite || busy}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          {canScanQr() && (
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={() => setScanning(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-input px-3 text-xs disabled:opacity-40"
            >
              <ScanLine className="size-4" /> {t("form.receipt.scan")}
            </button>
          )}
        </div>
        {scanning && <QrScanner onResult={onScan} onClose={() => setScanning(false)} />}
        <p className="text-xs text-muted-foreground">{t("form.receipt.hint")}</p>
        <button
          type="button"
          className={btnCls}
          disabled={!canWrite || busy || name.trim().length < 1 || body.trim().length < 5 || code.trim().length < 6}
          onClick={submit}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {t("form.sending")}
            </>
          ) : (
            t("form.publish")
          )}
        </button>
      </div>
      <ul className="space-y-2">
        {reviews.length === 0 && <li className="text-sm text-muted-foreground">{t("reviews.empty")}</li>}
        {reviews.map((r) => (
          <li key={r.id} className="rounded-xl border border-border bg-card/60 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{t("privacy.visitor")}</span>
              <span className="mono-label !text-[0.58rem]">{timeAgo(r.created_at, lang)}</span>
            </div>
            <div className="mt-0.5 flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`size-3.5 ${n <= r.rating ? "fill-kind-business text-kind-business" : "text-muted-foreground/40"}`}
                />
              ))}
            </div>
            <p className="mt-1 text-sm text-foreground/90">{r.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
