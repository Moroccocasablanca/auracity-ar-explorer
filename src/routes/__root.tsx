import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { I18nProvider } from "../lib/i18n";
import { LocationProvider } from "../lib/location";
import { BottomNav } from "../components/BottomNav";
import { ProximityWatcher } from "../components/ProximityWatcher";
import { Toaster } from "../components/ui/sonner";
import { PrivacyConsent } from "@/components/account/PrivacyConsent";
import { TestPanel } from "@/components/admin/TestPanel";
import { primeAudio } from "@/services/voice/speech";
import { registerServiceWorker } from "@/services/notifications/notify";
import { AppEnvironment } from "../components/AppEnvironment";
import { UpdateWatcher } from "../components/UpdateWatcher";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: ErrorComponentProps) {
  console.error(error);
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    // A page of an older version asking for files that a newer version replaced ("Failed to fetch dynamically imported module"): the cure is a fresh load,
    // done once and by itself, so nobody is left staring at an error after an update.
    const stale = /dynamically imported module|importing a module script failed|ChunkLoad|Loading chunk|Unexpected token '<'|error loading dynamically/i.test(String((error as Error | undefined)?.message ?? error));
    try {
      if (stale && sessionStorage.getItem("aura_stale_reload") !== "1") {
        sessionStorage.setItem("aura_stale_reload", "1");
        window.location.reload();
      }
    } catch { /* no storage: the button below still works */ }
  }, [error]);
  const it = typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("it");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{it ? "La pagina non si è caricata" : "This page didn't load"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {it ? "Probabilmente è uscita una versione nuova. Ricarica: ci vuole un attimo." : "A new version may have come out. Reload: it takes a moment."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              try { sessionStorage.removeItem("aura_stale_reload"); } catch { /* ignore */ }
              window.location.reload();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {it ? "Ricarica" : "Reload"}
          </button>
          <a
            href="/explore"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {it ? "Vai alla mappa" : "Go to the map"}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0b1220" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "AURACITY" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black" },
      { title: "AURACITY — Bra in realtà aumentata" },
      {
        name: "description",
        content: "Scopri Bra in realtà aumentata: monumenti, panchine e alberi che parlano, locali, eventi, farmacia di turno e una guida AI sempre con te.",
      },
      { property: "og:title", content: "AURACITY — Bra in realtà aumentata" },
      {
        property: "og:description",
        content: "Scopri Bra in realtà aumentata: monumenti, panchine e alberi che parlano, locali, eventi, farmacia di turno e una guida AI sempre con te.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      // Open the connections the map needs while the page is still loading (saves a round trip each on a phone network).
      { rel: "preconnect", href: "https://tiles.openfreemap.org", crossOrigin: "anonymous" },
      { rel: "preconnect", href: import.meta.env["VITE_SUPABASE_URL"] as string, crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://commons.wikimedia.org" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    primeAudio();
    void registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <LocationProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <BottomNav />
          <ProximityWatcher />
          <PrivacyConsent />
          <TestPanel />
          <AppEnvironment />
          <UpdateWatcher />
          <Toaster theme="dark" position="top-center" />
        </LocationProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
