import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { batterySaverPreference, POWER_EVENT } from "@/utils/power";
import { systemConfig } from "@/config/systemConfig";
import { cachedJson } from "@/utils/cache";
import { cleanOldCaches, precacheAssets, whenIdle } from "@/utils/assetCache";

/** Media that is always worth having ready on the phone: the mascots and the standard dish pictures. */
const CORE_MEDIA = ["barista", "chef", "tree", "bench", "hunt-owl", "hunt-cube", "hunt-orb"].map((n) => `/mascots/${n}.png`);

type BatteryManager = EventTarget & { level: number; charging: boolean };
type BatteryNavigator = Navigator & { getBattery?: () => Promise<BatteryManager> };

export function AppEnvironment() {
  const { t } = useI18n();
  const [installHint, setInstallHint] = useState(false);
  // Pre-store the recorded voices and the mascots as soon as the phone is idle: playback is then instant, also offline.
  useEffect(() => {
    whenIdle(async () => {
      await cleanOldCaches();
      const clips = (await cachedJson<string[]>("/audio/manifest.json")) ?? [];
      await precacheAssets(CORE_MEDIA);
      await precacheAssets(clips.map((f) => `/audio/${f}`));
    });
  }, []);
  useEffect(() => {
    let battery: BatteryManager | undefined;
    const syncPower = () => {
      const low = batterySaverPreference() && Boolean(battery && !battery.charging && battery.level < .2);
      document.documentElement.toggleAttribute("data-low-power", document.hidden || low);
    };
    const onPreference = () => syncPower();
    document.addEventListener("visibilitychange", syncPower);
    window.addEventListener(POWER_EVENT, onPreference);
    void (navigator as BatteryNavigator).getBattery?.().then((value) => { battery = value; value.addEventListener("levelchange", syncPower); value.addEventListener("chargingchange", syncPower); syncPower(); });
    if (systemConfig.pwaDeploymentReady) {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      setInstallHint(ios && !standalone && localStorage.getItem("aura_ios_install_hint") !== "1");
    }
    return () => { document.removeEventListener("visibilitychange", syncPower); window.removeEventListener(POWER_EVENT, onPreference); battery?.removeEventListener("levelchange", syncPower); battery?.removeEventListener("chargingchange", syncPower); };
  }, []);
  if (!installHint) return null;
  return <aside className="glass fixed inset-x-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[800] mx-auto max-w-sm rounded-lg p-3 text-sm">
    <p>{t("pwa.iosHint")}</p><div className="mt-2 flex items-center justify-end gap-2"><Link to="/privacy" className="text-muted-foreground">{t("privacy.read")}</Link><Button size="sm" variant="outline" onClick={() => { localStorage.setItem("aura_ios_install_hint", "1"); setInstallHint(false); }}>{t("pwa.dismiss")}</Button></div>
  </aside>;
}