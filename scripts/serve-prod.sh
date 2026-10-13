#!/bin/zsh
# Fast version for testing on the phone: builds the app and serves it on port 5173 (the tunnel keeps pointing there).
# Much faster than "bun run dev", which sends hundreds of unbundled files through the tunnel.
cd "$(dirname "$0")/.."
export PATH="$HOME/.bun/bin:$PATH"
lsof -ti tcp:5173 -sTCP:LISTEN | xargs kill 2>/dev/null # only the server, never the tunnel connected to it
sleep 1
NITRO_PRESET=bun bun run build > /tmp/aura-build.log 2>&1 || { tail -20 /tmp/aura-build.log; exit 1; }
PORT=5173 nohup bun .output/server/index.mjs > /tmp/aura-prod.log 2>&1 &
sleep 3
curl -s -o /dev/null -w "serving: HTTP %{http_code}\n" http://localhost:5173/explore
