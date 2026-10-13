import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { enableCulling, pickLevel } from "@/models3d/optimize";
import { createTtlCache, debounce, throttle } from "@/utils/cache";

describe("3D level of detail and culling", () => {
  const levels = [
    { url: "high.glb", maxDistance: 3 },
    { url: "mid.glb", maxDistance: 8 },
    { url: "low.glb", maxDistance: 30 },
  ];
  it("uses the lightest version that is still good enough", () => {
    expect(pickLevel(levels, 1).url).toBe("high.glb");
    expect(pickLevel(levels, 5).url).toBe("mid.glb");
    expect(pickLevel(levels, 20).url).toBe("low.glb");
    expect(pickLevel(levels, 500).url).toBe("low.glb");
  });
  it("turns on culling for every mesh and freezes static matrices", () => {
    const root = new THREE.Group();
    const a = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    const b = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial());
    b.frustumCulled = false;
    root.add(a, b);
    expect(enableCulling(root)).toBe(2);
    expect(a.frustumCulled && b.frustumCulled).toBe(true);
    expect(b.matrixAutoUpdate).toBe(false);
    expect(b.geometry.boundingSphere).not.toBeNull();
  });
});

describe("cache helpers", () => {
  it("a TTL cache forgets old entries and keeps within its size limit", () => {
    const c = createTtlCache<string, number>(60_000, 2);
    c.set("a", 1);
    c.set("b", 2);
    c.set("c", 3);
    expect(c.get("a")).toBeUndefined();
    expect(c.get("c")).toBe(3);
  });
  it("throttle lets one call through per window, debounce waits for quiet", async () => {
    let n = 0;
    const t = throttle(() => n++, 1000);
    t(); t(); t();
    expect(n).toBe(1);
    let d = 0;
    const db = debounce(() => d++, 20);
    db(); db(); db();
    await new Promise((r) => setTimeout(r, 60));
    expect(d).toBe(1);
  });
});
