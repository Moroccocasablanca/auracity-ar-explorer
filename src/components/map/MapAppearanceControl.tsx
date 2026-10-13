import { useEffect, useState } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { resolveMapAppearance, type MapAppearance, type MapMode } from "@/lib/map-appearance";

export function useMapAppearance() {
  const [mode, setMode] = useState<MapMode>("auto");
  const [appearance, setAppearance] = useState<MapAppearance>("night");
  useEffect(() => {
    const saved = localStorage.getItem("aura_map_mode");
    if (saved === "auto" || saved === "day" || saved === "night") setMode(saved);
  }, []);
  useEffect(() => {
    const update = () => setAppearance(resolveMapAppearance(mode, new Date()));
    update();
    const timer = window.setInterval(update, 30_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [mode]);
  return { mode, appearance, selectMode: (value: MapMode) => {
    setMode(value);
    localStorage.setItem("aura_map_mode", value);
  } };
}

export function MapAppearanceControl({ mode, onChange }: { mode: MapMode; onChange: (mode: MapMode) => void }) {
  const { t } = useI18n();
  return <div role="group" aria-label={t("map.appearance")} className="inline-flex gap-1 rounded-lg border border-border bg-card p-1">
    {([
      { mode: "auto", Icon: SunMoon, label: "map.auto" },
      { mode: "day", Icon: Sun, label: "map.day" },
      { mode: "night", Icon: Moon, label: "map.night" },
    ] as const).map(({ mode: value, Icon, label }) => <Button key={value} size="sm" variant={mode === value ? "default" : "ghost"} aria-pressed={mode === value} title={t(label)} onClick={() => onChange(value)}>
      <Icon /><span>{t(label)}</span>
    </Button>)}
  </div>;
}