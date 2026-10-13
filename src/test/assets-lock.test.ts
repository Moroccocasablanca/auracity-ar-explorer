import { describe, expect, it } from "vitest";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

// ABSOLUTE RULE of the project: premium 3D assets (mascots, avatars, dishes, recorded voices) are never replaced or degraded.
// The lock file holds the fingerprint of each one; this test fails if any file is missing or has changed.
const root = path.resolve(__dirname, "../..");
const lock = JSON.parse(fs.readFileSync(path.join(root, "assets.lock.json"), "utf8")) as Record<string, { bytes: number; sha256: string }>;

describe("premium assets are protected", () => {
  it("the lock lists the assets", () => {
    expect(Object.keys(lock).length).toBeGreaterThan(30);
  });
  for (const [file, fp] of Object.entries(lock)) {
    it(`${file} is untouched`, () => {
      const p = path.join(root, file);
      expect(fs.existsSync(p), `${file} was removed`).toBe(true);
      const buf = fs.readFileSync(p);
      expect(buf.length, `${file} changed size`).toBe(fp.bytes);
      expect(crypto.createHash("sha256").update(buf).digest("hex"), `${file} was modified`).toBe(fp.sha256);
    });
  }
});
