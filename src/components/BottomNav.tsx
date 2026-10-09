import { Link } from "@tanstack/react-router";
import { Compass, Scan, Store } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const items = [
  { to: "/", key: "nav.ar", Icon: Scan },
  { to: "/explore", key: "nav.explore", Icon: Compass },
  { to: "/business", key: "nav.business", Icon: Store },
] as const;

export function BottomNav() {
  const { t, lang, setLang } = useI18n();
  return (
    <nav className="glass fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center justify-between rounded-full px-2 py-1.5">
      {items.map(({ to, key, Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="flex flex-1 flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-muted-foreground transition-colors"
          activeProps={{ className: "text-primary bg-primary/10" }}
        >
          <Icon className="size-5" />
          <span className="text-[0.65rem] font-medium tracking-wide">{t(key)}</span>
        </Link>
      ))}
      <button
        type="button"
        onClick={() => setLang(lang === "it" ? "en" : "it")}
        aria-label="Language"
        className="mx-1 flex size-10 items-center justify-center rounded-full border border-border font-mono text-xs font-semibold uppercase text-foreground transition-colors hover:bg-accent"
      >
        {lang === "it" ? "EN" : "IT"}
      </button>
    </nav>
  );
}
