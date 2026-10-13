import { Link } from "@tanstack/react-router";
import { Compass, MessagesSquare, Scan, Sparkles, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n";

// Order: the map first, then the camera, the guide, the adventure and the account (language and "for venues" are inside Account).
const items = [
  { to: "/explore", key: "nav.explore", Icon: Compass },
  { to: "/", key: "nav.ar", Icon: Scan },
  { to: "/guide", key: "nav.guide", Icon: MessagesSquare },
  { to: "/quest", key: "nav.quest", Icon: Sparkles },
  { to: "/auth", key: "nav.account", Icon: UserRound },
] as const;

export function BottomNav() {
  const { t } = useI18n();
  return (
    <nav className="fixed inset-x-3 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center justify-between rounded-full border border-border bg-card/97 px-1.5 py-1 shadow-xl">
      {items.map(({ to, key, Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="flex flex-1 flex-col items-center gap-0 rounded-full px-1 py-1 text-muted-foreground transition-colors"
          activeProps={{ className: "text-primary bg-primary/10" }}
        >
          <Icon className="size-5" />
          <span className="text-[0.62rem] font-medium tracking-wide">{t(key)}</span>
        </Link>
      ))}
    </nav>
  );
}
