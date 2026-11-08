#!/bin/bash
# One command to put the app on the phone: new tunnel -> wait until it answers -> build the iPhone app with that address -> install -> open.
cd "$(dirname "$0")/.."
export PATH="$HOME/.bun/bin:$PATH"
DEV=00008110-00121C24228B801E
pkill -x cloudflared; sleep 1
(cd ~/cloudflared-bin && nohup ./cloudflared tunnel --url http://localhost:5173 --no-autoupdate --protocol http2 > /tmp/cf2.log 2>&1 &)
for i in $(seq 1 40); do u=$(grep -aoE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/cf2.log | head -1); [ -n "$u" ] && break; sleep 1; done
echo "$u" > /tmp/tunnel-url
for i in $(seq 1 30); do c=$(curl -s -m 8 -o /dev/null -w "%{http_code}" "$u/explore"); [ "$c" = 200 ] && break; sleep 6; done
echo "tunnel $c $u"
CAP_SERVER_URL="$u/explore" bunx cap sync ios 2>&1 | tail -1
(cd ios/App && xcodebuild -project App.xcodeproj -scheme App -configuration Debug -destination "id=$DEV" -derivedDataPath /tmp/auradd DEVELOPMENT_TEAM=ZX4M9T4HZX -allowProvisioningUpdates build 2>&1 | tail -1)
APP=$(find /tmp/auradd -name "App.app" -path "*Debug-iphoneos*" | head -1)
xcrun devicectl device install app --device $DEV "$APP" 2>&1 | tail -1
xcrun devicectl device process launch --device $DEV --terminate-existing it.auracity.bra 2>&1 | tail -1
