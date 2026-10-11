import { useCallback, useEffect, useState } from "react";
import { systemConfig } from "./systemConfig";

const KEY = "aura_battery_saver";
export const POWER_EVENT = "aura-power-change";

export function batterySaverPreference() {
  return systemConfig.lowBatteryModeEnabled && localStorage.getItem(KEY) !== "0";
}

export function useBatterySaver() {
  const [enabled, setEnabledState] = useState(systemConfig.lowBatteryModeEnabled);
  useEffect(() => setEnabledState(batterySaverPreference()), []);
  const setEnabled = useCallback((next: boolean) => {
    localStorage.setItem(KEY, next ? "1" : "0");
    setEnabledState(next);
    window.dispatchEvent(new CustomEvent(POWER_EVENT, { detail: next }));
  }, []);
  return { enabled, setEnabled };
}