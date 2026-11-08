#!/bin/zsh
# Fast version for testing on the phone: builds the app and serves it on port 5173 (the tunnel keeps pointing there).
# The site keeps running from a snapshot (.served) WHILE the new version is built, and is swapped in at the end: the phone sees about 2 seconds
# of downtime instead of the whole build (before, the site was off for a minute and the app on the phone "did nothing").
cd "$(dirname "$0")/.."
SERVE="$HOME/.auracity-served"
export PATH="$HOME/.bun/bin:$PATH"
# While the new version is swapped in, the watchdog must not restart the server (it would serve a half-copied folder: blank app).
touch /tmp/aura-updating; trap 'rm -f /tmp/aura-updating' EXIT
rm -rf .output
NITRO_PRESET=bun bun run build > /tmp/aura-build.log 2>&1 || { tail -20 /tmp/aura-build.log; exit 1; }
rm -rf "$SERVE".new && cp -R .output "$SERVE".new
# Keep the files of the PREVIOUS version too (their names carry a fingerprint, so they never clash): a phone that still holds the old page keeps working
# until it updates, instead of asking for files that no longer exist and showing an error.
[ -d "$SERVE"/public/assets ] && perl -e 'alarm 60; exec @ARGV' rsync -a --ignore-existing "$SERVE"/public/assets/ "$SERVE".new/public/assets/ 2>/dev/null
lsof -ti tcp:5173 -sTCP:LISTEN | xargs kill 2>/dev/null # only the server, never the tunnel connected to it
sleep 1
rm -rf "$SERVE" && mv "$SERVE".new "$SERVE"
(cd "$SERVE" && DATA_DIR="$HOME/Desktop/drop/auracity" PORT=5173 nohup bun server/index.mjs > /tmp/aura-prod.log 2>&1 &)
sleep 2
curl -s -o /dev/null -w "serving: HTTP %{http_code}\n" http://localhost:5173/explore
