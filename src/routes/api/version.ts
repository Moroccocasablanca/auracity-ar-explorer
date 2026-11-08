// Tells the phone which build the server is running, so an open app can update itself silently.
// `purge` lists phone caches to throw away with this release (Cache Storage names or localStorage keys); usually empty.
import { createFileRoute } from "@tanstack/react-router";

declare const __AURA_BUILD__: string;
const BUILD = typeof __AURA_BUILD__ === "string" ? __AURA_BUILD__ : "dev";
const PURGE: string[] = (process.env["AURA_PURGE"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export const Route = createFileRoute("/api/version")({
  server: {
    handlers: {
      GET: () => Response.json({ build: BUILD, purge: PURGE }, { headers: { "cache-control": "no-store" } }),
    },
  },
});
