import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { distanceM } from "@/lib/geo";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { nodesQuery, promo } from "@/lib/nodes";

/** Distance at which a place "calls" you (wider than the interaction radius). */
export const ALERT_RADIUS_M = 60;
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
    window.addEventListener("aura-prox", read);
    return () => window.removeEventListener("aura-prox", read);
  }, []);

  useEffect(() => {
    if (!on || !pos || demo) return;
    for (const n of nodes) {
      if (seen.current.has(n.id)) continue;
      if (distanceM(pos, n) > Math.max(ALERT_RADIUS_M, n.radius_m)) continue;
      seen.current.add(n.id);
      sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen.current]));
      const offer = promo(n, lang);
      const text =
        n.kind === "monument"
          ? t("prox.monument", { name: n.name })
          : n.kind === "business" && offer
            ? t("prox.business", { name: n.name, promo: offer })
            : t("prox.near", { name: n.name });
      const open = () => navigate({ to: "/node/$slug", params: { slug: n.slug } });
      toast(text, { action: { label: t("prox.open"), onClick: open }, duration: 10000 });
      if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
        const notif = new Notification("AURACITY", { body: text, tag: n.id });
        notif.onclick = () => {
          window.focus();
          open();
        };
      }
      break; // one alert at a time
    }
  }, [on, pos, demo, nodes, lang, t, navigate]);

  return null;
}
