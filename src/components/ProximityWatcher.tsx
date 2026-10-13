import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { distanceM } from "@/lib/geo";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { nodesQuery } from "@/lib/nodes";
import { inviteBody } from "@/lib/invites";
import { showSystemNotice } from "@/lib/notify";
import { isNative, onNoticeTap, startBackgroundWatch } from "@/lib/native";
import { ACTIVITIES, activityInvite, findActivity } from "@/lib/activities";
import { markNotified, mayNotify } from "@/lib/notify-prefs";
import { systemConfig, venueFeaturesEnabled } from "@/lib/systemConfig";

/** Distance at which a place "calls" you (wider than the interaction radius). */
export const ALERT_RADIUS_M = systemConfig.proximityLoadingRadiusMeters;
const PREF_KEY = "aura_prox_alerts";
const SEEN_KEY = "aura_prox_seen";

export function useProximityAlerts() {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(true);
    setEnabled(localStorage.getItem(PREF_KEY) === "1");
  }, []);
  const enable = useCallback(async () => {
    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        /* in-app alerts still work */
      }
    }
    localStorage.setItem(PREF_KEY, "1");
    setEnabled(true);
    window.dispatchEvent(new Event("aura-prox"));
  }, []);
  return { supported, enabled, enable };
}

/** Mounted once at the root: shows an alert the first time you get close to each place. */
export function ProximityWatcher() {
  const { t, lang } = useI18n();
  const { pos, demo } = useLocation();
  const { data: nodes = [] } = useQuery(nodesQuery);
  const navigate = useNavigate();
  const [on, setOn] = useState(false);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const read = () => setOn(localStorage.getItem(PREF_KEY) === "1");
    read();
    try {
      seen.current = new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
    } catch {
      seen.current = new Set();
    }
    const reset = () => {
      seen.current = new Set();
      sessionStorage.removeItem(SEEN_KEY);
    };
    window.addEventListener("aura-prox", read);
    window.addEventListener("aura-prox-reset", reset);
    return () => {
      window.removeEventListener("aura-prox", read);
      window.removeEventListener("aura-prox-reset", reset);
    };
  }, []);

  /** Shows the invitation of a place: a big in-app card, plus a system notification when the app is in the background. */
  const fire = useCallback(
    (n: (typeof nodes)[number], force = false, custom?: string) => {
      const open = () => navigate({ to: "/node/$slug", params: { slug: n.slug } });
      const monument = n.kind === "monument";
      const body = custom ? `⚡ ${custom}` : monument ? t("prox.monument", { name: n.name }) : n.kind === "business" ? inviteBody(n, lang, t("prox.invite.default")) : t("prox.near", { name: n.name });
      toast(n.name, { description: body, action: { label: t("prox.open"), onClick: open }, duration: 15000 });
      if (typeof document !== "undefined" && (document.hidden || force)) void showSystemNotice(n.name, body, `/node/${n.slug}`, n.id);
    },
    [lang, navigate, t],
  );

  // Owner test button: "send me the invitation now".
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ nodeId: string; text?: string }>).detail;
      const id = d?.nodeId;
      const custom = d?.text;
      const n = nodes.find((x) => x.id === id);
      if (n) return void fire(n, true, custom);
      const act = id ? findActivity(id) : undefined;
      if (act) {
        const body = activityInvite(act, t("prox.invite.default"));
        toast(act.name ?? "", { description: body, action: { label: t("prox.open"), onClick: () => navigate({ to: "/attivita/$id", params: { id: act.id } }) }, duration: 15000 });
        void showSystemNotice(act.name ?? "AURACITY", body, `/attivita/${act.id}`, act.id);
      }
    };
    window.addEventListener("aura-test-invite", h);
    return () => window.removeEventListener("aura-test-invite", h);
  }, [nodes, fire]);

  /** Invites you once per place the first time you are close to it. */
  const check = useCallback(
    (p: { lat: number; lng: number }, force = false) => {
      // Only places the user chose can notify (followed venues / gyms; monuments and gardens only if switched on),
      // at most a few a day and never the same place twice in a day.
      for (const n of nodes) {
        if (n.kind !== "business" || seen.current.has(n.id)) continue;
        if (n.kind === "business" && !venueFeaturesEnabled(n.subscribed)) continue;
        if (distanceM(p, n) > Math.max(ALERT_RADIUS_M, n.radius_m)) continue;
        if (!mayNotify(n.id)) continue;
        seen.current.add(n.id);
        sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen.current]));
        markNotified(n.id);
        fire(n, force);
        return; // one alert at a time
      }
      for (const a of ACTIVITIES) {
        if (seen.current.has(a.id) || distanceM(p, a) > ALERT_RADIUS_M || !mayNotify(a.id)) continue;
        seen.current.add(a.id);
        markNotified(a.id);
        const body = activityInvite(a, t("prox.invite.default"));
        toast(a.name ?? "", { description: body, action: { label: t("prox.open"), onClick: () => navigate({ to: "/attivita/$id", params: { id: a.id } }) }, duration: 15000 });
        void showSystemNotice(a.name ?? "AURACITY", body, `/attivita/${a.id}`, a.id);
        return;
      }
    },
    [nodes, fire, navigate, t],
  );

  useEffect(() => {
    if (!on || !pos || demo) return;
    check(pos);
  }, [on, pos, demo, check]);

  // Native app: keep following the phone with the screen locked and send a real notification.
  const checkRef = useRef(check);
  checkRef.current = check;
  useEffect(() => {
    if (!on || !isNative()) return;
    let stop = () => {};
    let gone = false;
    void startBackgroundWatch((p) => checkRef.current(p, true), "AURACITY", t("native.bg")).then((s) => {
      if (gone) s();
      else stop = s;
    });
    return () => {
      gone = true;
      stop();
    };
  }, [on, t]);

  useEffect(() => {
    let off = () => {};
    void onNoticeTap((url) => navigate({ to: url })).then((o) => (off = o));
    return () => off();
  }, [navigate]);

  return null;
}
