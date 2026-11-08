// "Cambia faccia": the face is really reshaped, live. The 478-point face mesh is split in its 852 small triangles and every triangle of the
// camera picture is stretched onto a moved copy of the mesh (big cartoon eyes, a baby face, an alien head...). Everything on the phone.
import { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { Face, Frame, Pt } from "@/components/fun/effects";

export type WarpId = "cartoon" | "baby" | "alien" | "grin" | "longface" | "morph";

const T = FaceLandmarker.FACE_LANDMARKS_TESSELATION;
const TRI: [number, number, number][] = [];
for (let k = 0; k + 2 < T.length; k += 3) TRI.push([T[k]!.start, T[k + 1]!.start, T[k + 2]!.start]);

// mesh points used as centres
const L_EYE = [33, 133, 159, 145];
const R_EYE = [362, 263, 386, 374];
const MOUTH = [61, 291, 13, 14];
const NOSE = 1;
const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const avg = (m: Pt[], ids: number[]): Pt => ({ x: ids.reduce((s, i) => s + m[i]!.x, 0) / ids.length, y: ids.reduce((s, i) => s + m[i]!.y, 0) / ids.length });

/** Pushes points away from (k > 0) or towards (k < 0) a centre, strongest in the middle and fading out at radius r. */
function lens(p: Pt, c: Pt, r: number, k: number): Pt {
  const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
  if (d >= r || d === 0) return p;
  const f = 1 + k * (1 - d / r) ** 2;
  return { x: c.x + dx * f, y: c.y + dy * f };
}

type Shape = { eyes: number; mouth: number; nose: number; chin: number; fore: number; width: number; grin: number; long: number };
const SHAPES: Record<Exclude<WarpId, "morph">, Shape> = {
  cartoon: { eyes: 0.95, mouth: -0.25, nose: -0.35, chin: -0.28, fore: 0.08, width: 0, grin: 0.15, long: 0 },
  baby: { eyes: 0.6, mouth: -0.35, nose: -0.45, chin: -0.4, fore: 0.18, width: 0.14, grin: 0, long: -0.1 },
  alien: { eyes: 1.25, mouth: -0.55, nose: -0.7, chin: -0.55, fore: 0.45, width: -0.08, grin: 0, long: 0.12 },
  grin: { eyes: 0.15, mouth: 0.35, nose: 0, chin: 0, fore: 0, width: 0.05, grin: 1, long: 0 },
  longface: { eyes: -0.1, mouth: 0, nose: 0.2, chin: 0.5, fore: 0.25, width: -0.22, grin: 0, long: 0.55 },
};
const ORDER: Exclude<WarpId, "morph">[] = ["cartoon", "baby", "alien", "grin", "longface"];
const mix = (a: Shape, b: Shape, k: number): Shape => Object.fromEntries(Object.keys(a).map((n) => [n, a[n as keyof Shape] + (b[n as keyof Shape] - a[n as keyof Shape]) * k])) as Shape;
const ease = (x: number) => x * x * (3 - 2 * x);

function shapeFor(id: WarpId, f: Frame): Shape {
  const s = (sh: Shape) => ({ ...sh, eyes: sh.eyes * (1 + 0.18 * f.beat) }); // the eyes pop on the beat
  if (id !== "morph") return s(SHAPES[id]);
  // "Trasformista": one face every 2 beats, sliding smoothly into the next
  const pos = f.bp / 2, i = Math.floor(pos) % ORDER.length, k = ease(Math.min(1, (pos % 1) * 2.2));
  return s(mix(SHAPES[ORDER[i]!], SHAPES[ORDER[(i + 1) % ORDER.length]!], k));
}

function warped(fc: Face, sh: Shape): Pt[] {
  const m = fc.mesh!;
  const le = avg(m, L_EYE), re = avg(m, R_EYE), mo = avg(m, MOUTH), no = m[NOSE]!;
  const w = fc.w, ux = Math.sin(fc.roll), uy = -Math.cos(fc.roll); // "up" of the face
  const cx = no.x, cy = no.y;
  return m.map((p0) => {
    let p = p0;
    p = lens(p, le, w * 0.3, sh.eyes);
    p = lens(p, re, w * 0.3, sh.eyes);
    p = lens(p, mo, w * 0.32, sh.mouth);
    p = lens(p, no, w * 0.2, sh.nose);
    // along the face: + up (forehead) / - down (chin)
    const dx = p.x - cx, dy = p.y - cy;
    const along = (dx * ux + dy * uy) / w, across = (dx * uy - dy * ux) / w;
    let a = along, b = across;
    if (a > 0) a *= 1 + sh.fore + sh.long * 0.5; else a *= 1 + sh.chin * Math.min(1, -a * 2.2) + sh.long;
    b *= 1 + sh.width * (a < 0 ? 1.3 : 0.7);
    // grin: lifts the mouth corners and the cheeks
    if (sh.grin) {
      const dm = Math.hypot(p.x - mo.x, p.y - mo.y) / w;
      if (dm < 0.45) a += sh.grin * 0.09 * Math.abs(b) * 2.4 * (1 - dm / 0.45);
    }
    return { x: cx + (b * uy + a * ux) * w, y: cy + (-b * ux + a * uy) * w };
  });
}

/** Draws one source triangle of the picture onto a destination triangle (affine map), a hair bigger so no seams show. */
function tri(c: CanvasRenderingContext2D, img: HTMLCanvasElement, s0: Pt, s1: Pt, s2: Pt, d0: Pt, d1: Pt, d2: Pt) {
  const gx = (d0.x + d1.x + d2.x) / 3, gy = (d0.y + d1.y + d2.y) / 3;
  const g = (p: Pt) => { const dx = p.x - gx, dy = p.y - gy, l = Math.hypot(dx, dy) || 1; return { x: p.x + (dx / l) * 0.9, y: p.y + (dy / l) * 0.9 }; };
  const e0 = g(d0), e1 = g(d1), e2 = g(d2);
  const den = s0.x * (s2.y - s1.y) - s1.x * s2.y + s2.x * s1.y + (s1.x - s2.x) * s0.y;
  if (Math.abs(den) < 1e-6) return;
  const a = -(s0.y * (d2.x - d1.x) - s1.y * d2.x + s2.y * d1.x + (s1.y - s2.y) * d0.x) / den;
  const b = (s1.y * d2.y + s0.y * (d1.y - d2.y) - s2.y * d1.y + (s2.y - s1.y) * d0.y) / den;
  const cc = (s0.x * (d2.x - d1.x) - s1.x * d2.x + s2.x * d1.x + (s1.x - s2.x) * d0.x) / den;
  const d = -(s1.x * d2.y + s0.x * (d1.y - d2.y) - s2.x * d1.y + (s2.x - s1.x) * d0.y) / den;
  const e = (s0.x * (s2.y * d1.x - s1.y * d2.x) + s0.y * (s1.x * d2.x - s2.x * d1.x) + (s2.x * s1.y - s1.x * s2.y) * d0.x) / den;
  const ff = (s0.x * (s2.y * d1.y - s1.y * d2.y) + s0.y * (s1.x * d2.y - s2.x * d1.y) + (s2.x * s1.y - s1.x * s2.y) * d0.y) / den;
  c.save();
  c.beginPath();
  c.moveTo(e0.x, e0.y); c.lineTo(e1.x, e1.y); c.lineTo(e2.x, e2.y); c.closePath();
  c.clip();
  c.transform(a, b, cc, d, e, ff);
  c.drawImage(img, 0, 0);
  c.restore();
}

/** Base layer for a face-changing effect: the picture with the reshaped face(s). */
export function drawWarp(id: WarpId, f: Frame): void {
  const { c, base } = f;
  c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  c.drawImage(base, 0, 0);
  for (const fc of f.faces) {
    if (!fc.mesh || fc.mesh.length < 468) continue;
    const src = fc.mesh, dst = warped(fc, shapeFor(id, f));
    for (const [i, j, k] of TRI) tri(c, base, src[i]!, src[j]!, src[k]!, dst[i]!, dst[j]!, dst[k]!);
    if (id === "alien") {
      // a soft green skin only on the face
      c.save(); c.globalCompositeOperation = "color"; c.globalAlpha = 0.55; c.fillStyle = "#3ddc84";
      c.beginPath(); const o = OVAL.map((n) => dst[n]!); o.forEach((p, n) => (n ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fill(); c.restore();
    }
  }
}
