// Smooth 3D: only draw what is on screen (frustum culling), swap to lighter versions when far (level of detail),
// and show something at once while the full model streams in (progressive loading).
import * as THREE from "three";
import { loadGlb } from "@/models3d/loader";

export type LodLevel = { url: string; /** this version is used up to this distance (in model heights) */ maxDistance: number };

/** The lightest level that is still good enough at this distance; the sharpest one when very close. */
export function pickLevel(levels: LodLevel[], distance: number): LodLevel {
  const sorted = [...levels].sort((a, b) => a.maxDistance - b.maxDistance);
  return sorted.find((l) => distance <= l.maxDistance) ?? sorted[sorted.length - 1]!;
}

/** Makes sure every mesh is skipped by the renderer when it is outside the camera view. */
export function enableCulling(root: THREE.Object3D): number {
  let meshes = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.frustumCulled = true;
    m.geometry.computeBoundingSphere();
    m.matrixAutoUpdate = false; // static parts of a model never need their matrix rebuilt every frame
    m.updateMatrix();
    meshes++;
  });
  return meshes;
}

/**
 * Builds a THREE.LOD from several versions of the same model. The lightest version loads first, so something appears
 * immediately; the sharper ones arrive after and join the LOD as they are ready (`onLevel` tells the caller to render again).
 */
export function createProgressiveLod(levels: LodLevel[], onLevel?: (loaded: number, total: number) => void): { lod: THREE.LOD; done: Promise<void> } {
  const lod = new THREE.LOD();
  const order = [...levels].sort((a, b) => b.maxDistance - a.maxDistance); // far / lightest first
  let loaded = 0;
  // LOD distances work the other way round: the level is used from `distance` onwards. Sharper level = smaller start distance.
  const sharpest = Math.min(...levels.map((l) => l.maxDistance));
  const done = (async () => {
    for (const level of order) {
      const gltf = await loadGlb(level.url);
      const scene = gltf.scene.clone(true);
      enableCulling(scene);
      lod.addLevel(scene, level.maxDistance === sharpest ? 0 : level.maxDistance);
      loaded++;
      onLevel?.(loaded, levels.length);
    }
  })();
  return { lod, done };
}
