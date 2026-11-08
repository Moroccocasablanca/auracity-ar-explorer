// Gets the face / body engine ready FAST. The engine (about 13 MB, 3 MB compressed) and the models are kept in the phone's own storage after the first time,
// and are even brought there quietly while someone is looking at the map, so the funny camera opens at once.
import { FilesetResolver } from "@mediapipe/tasks-vision";

const CACHE = "aura-engine-v1";
const FILES = {
  loader: "/mediapipe/wasm/vision_wasm_internal.js",
  wasm: "/mediapipe/wasm/vision_wasm_internal.wasm",
  face: "/mediapipe/face_landmarker.task",
  pose: "/mediapipe/pose_landmarker_lite.task",
};
const urls = new Map<string, Promise<string>>();

/** Address of a file taken from the phone's storage (downloaded and stored the first time). Falls back to the normal address. */
export function localUrl(path: string): Promise<string> {
  let p = urls.get(path);
  if (!p) {
    p = (async () => {
      try {
        const cache = await caches.open(CACHE);
        let res = await cache.match(path);
        if (!res) {
          const net = await fetch(path);
          if (!net.ok) return path;
          await cache.put(path, net.clone());
          res = net;
        }
        return URL.createObjectURL(await res.blob());
      } catch {
        return path;
      }
    })();
    urls.set(path, p);
  }
  return p;
}

type Fileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;
let fileset: Promise<Fileset> | null = null;
export function engineFileset(): Promise<Fileset> {
  fileset ??= (async () => {
    const [wasmLoaderPath, wasmBinaryPath] = await Promise.all([localUrl(FILES.loader), localUrl(FILES.wasm)]);
    return { wasmLoaderPath, wasmBinaryPath } as Fileset;
  })();
  return fileset;
}
export const faceModelUrl = () => localUrl(FILES.face);
export const poseModelUrl = () => localUrl(FILES.pose);

/** The plain way (straight from the server), used if the stored copy does not work for some reason. */
export const plainFileset = () => FilesetResolver.forVisionTasks("/mediapipe/wasm");
export const PLAIN_FACE = FILES.face;
export const PLAIN_POSE = FILES.pose;

/** Stores the engine and the face model on the phone in the background (not on a slow or data-saving connection). */
export function warmEngine(): void {
  const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!("caches" in window) || c?.saveData || c?.effectiveType === "2g" || c?.effectiveType === "slow-2g") return;
  void engineFileset().then(() => faceModelUrl());
}
