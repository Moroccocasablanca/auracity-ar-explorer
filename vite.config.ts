// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  // Smaller downloads on our own hosting (Render, Docker): the build writes gzip/brotli copies of every asset next to it.
  nitro: { compressPublicAssets: true, routeRules: { "/**": { headers: { "cache-control": "no-cache" } }, "/assets/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } } } } as never,
  // Pre-bundle these up front so the dev server never re-optimizes mid-session
  // (a late re-optimization can load a second React copy and blank the screen).
  vite: {
    // One id per build, shared by phone code and server: when they differ the phone knows a new version is out.
    define: { __AURA_BUILD__: JSON.stringify(Date.now().toString(36)) },
    optimizeDeps: { include: ["sonner", "lucide-react", "maplibre-gl", "supercluster"] },
    // Lets the owner open the local dev server from a phone through a temporary Cloudflare tunnel.
    server: { allowedHosts: [".trycloudflare.com"] },
    plugins: [mcpPlugin()],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
