#!/bin/bash
# Keeps the site and the tunnel alive while nobody is watching: checks every 30 seconds and restarts what has stopped.
cd "$(dirname "$0")/.."
export PATH="$HOME/.bun/bin:$PATH"
while true; do
  # an update is in progress (serve-prod.sh): wait, unless it is older than 10 minutes (left behind by a crash)
  if [ -f /tmp/aura-updating ] && [ "$(find /tmp/aura-updating -mmin -10)" ]; then sleep 5; continue; fi
  if ! curl -s -m 5 -o /dev/null http://localhost:5173/explore; then
    lsof -ti tcp:5173 -sTCP:LISTEN | xargs kill 2>/dev/null
    (cd "$HOME/.auracity-served" && DATA_DIR="$HOME/Desktop/drop/auracity" PORT=5173 nohup bun server/index.mjs > /tmp/aura-prod.log 2>&1 &)
    echo "$(date) server restarted" >> /tmp/aura-watch.log
  fi
  # a tunnel that the server has thrown away keeps its process alive but is dead: restart that too
  if grep -aq "Tunnel not found" /tmp/cf3.log 2>/dev/null && [ "$(find /tmp/cf3.log -mmin -2)" ]; then pkill -x cloudflared; fi
  # the tunnel process can stay alive while its address no longer answers: after 3 failed checks in a row, restart it
  U=$(cat /tmp/tunnel-url 2>/dev/null)
  if [ -n "$U" ] && pgrep -x cloudflared > /dev/null; then
    if curl -s -m 10 -o /dev/null "$U/explore"; then FAILS=0; else FAILS=$(( ${FAILS:-0} + 1 )); fi
    if [ "${FAILS:-0}" -ge 3 ]; then pkill -x cloudflared; FAILS=0; sleep 2; fi
  fi
  if ! pgrep -x cloudflared > /dev/null; then
    (cd ~/cloudflared-bin && nohup ./cloudflared tunnel --url http://localhost:5173 --no-autoupdate --protocol http2 > /tmp/cf3.log 2>&1 &)
    sleep 15
    grep -aoE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cf3.log | head -1 > /tmp/tunnel-url
    echo "$(date) tunnel restarted: $(grep -aoE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cf3.log | head -1)" >> /tmp/aura-watch.log
  fi
  sleep 30
done
