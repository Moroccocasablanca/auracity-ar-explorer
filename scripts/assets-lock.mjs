// Protects the premium 3D assets: records the exact fingerprint (size + SHA-256) of every media file.
// A test (src/test/assets-lock.test.ts) fails if any of them is removed, replaced or degraded.
// To add NEW assets on purpose:  bun run scripts/assets-lock.mjs   (new files are added; existing ones are never overwritten).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOTS = ["public/models", "public/mascots", "public/avatars", "public/dishes", "public/audio", "src/assets"];
const LOCK = "assets.lock.json";
const lock = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, "utf8")) : {};
let added = 0;
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(png|jpe?g|webp|glb|gltf|m4a|mp3|wav|mp4)$/i.test(f) && !(p in lock)) {
      const buf = fs.readFileSync(p);
      lock[p] = { bytes: buf.length, sha256: crypto.createHash("sha256").update(buf).digest("hex") };
      added++;
    }
  }
}
for (const r of ROOTS) if (fs.existsSync(r)) walk(r);
fs.writeFileSync(LOCK, JSON.stringify(Object.fromEntries(Object.entries(lock).sort()), null, 1) + "\n");
console.log(`${Object.keys(lock).length} protected assets (${added} new)`);
