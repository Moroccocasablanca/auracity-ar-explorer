// Loads free GLB / glTF models (avatars, monuments) with a cache, so the same file is never downloaded or parsed twice.
// Free sources for the models themselves: Quaternius, Kenney, Poly Pizza (CC0) or models made with Higgsfield / Meshy.
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();

/** Loads a .glb file once; later calls return the same promise. */
export function loadGlb(url: string): Promise<GLTF> {
  let p = cache.get(url);
  if (!p) {
    p = loader.loadAsync(url);
    p.catch(() => cache.delete(url)); // a failed download can be tried again
    cache.set(url, p);
  }
  return p;
}

/** A private copy of a loaded model (so two places on screen can show the same avatar independently). */
export async function cloneGlb(url: string): Promise<THREE.Object3D> {
  const gltf = await loadGlb(url);
  return gltf.scene.clone(true);
}

/** Scales and centres a model so it fits a box of the given height, standing on the ground. */
export function fitToHeight(obj: THREE.Object3D, height = 2): void {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  if (size.y > 0) obj.scale.multiplyScalar(height / size.y);
  const fitted = new THREE.Box3().setFromObject(obj);
  const center = fitted.getCenter(new THREE.Vector3());
  obj.position.x -= center.x;
  obj.position.z -= center.z;
  obj.position.y -= fitted.min.y;
}

/** Frees the GPU memory of a model that is no longer shown. */
export function disposeModel(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}
