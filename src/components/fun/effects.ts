// The funny camera effects - the kind that go viral on TikTok: your FACE is cut out and dances to the music (alone, big, or on a dancing body),
// the camera "dances" with you (face zoom), the face bulges to the beat. Everything is drawn on a canvas on the phone: nothing is sent anywhere.

import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { drawWarp, type WarpId } from "@/components/fun/facewarp";
import { drawTimeWarp, tinyHead } from "@/components/fun/fx2";

export type Pt = { x: number; y: number };

/** What we know about one face, already in canvas pixels. */
export type Face = {
  nose: Pt;
  eyeA: Pt;
  eyeB: Pt;
  fore: Pt;
  chin: Pt;
  mouth: Pt;
  /** the outline of the face (36 points) */
  oval: Pt[];
  /** all 478 points of the face mesh */
  mesh?: Pt[];
  /** face width in pixels */
  w: number;
  /** head tilt in radians */
  roll: number;
  open: number; // mouth open 0..1
  smile: number; // 0..1
  brow: number; // eyebrows raised 0..1
};

export type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; ch?: string; color?: string; g: number; spin: number; rot: number };

export type Frame = {
  c: CanvasRenderingContext2D;
  base: HTMLCanvasElement;
  W: number;
  H: number;
  t: number;
  faces: Face[];
  parts: Particle[];
  /** beat pulse of the music, 1 on the beat and fading to 0 */
  beat: number;
  /** position in the music, in beats (1.0 = one beat later): the dances are written on it */
  bp: number;
  /** smoothed centre of the first face (used by the zoom) */
  smooth: { x: number; y: number; roll: number; w: number };
  /** the body of the first person (shoulders and hips), when the body is in the picture */
  pose: Pose | null;
};

export type Pose = { shL: Pt; shR: Pt; hipL: Pt; hipR: Pt };

export type EffectId = "rock" | "hero" | "elastic" | "twins" | "hips" | "dance" | "body" | "bighead" | "zoom" | "bulge" | "cam" | "echo" | "kaleido" | "punch" | "split" | "strobe" | "eyes" | "mouth" | "rainbow" | "fire" | "mirror" | "disco" | "glitch" | "noir" | "neon" | "vhs" | "pop" | "dream" | "cinema" | "scan" | "paint" | "sym" | WarpId | "timewarp" | "tiny";
// Every effect dances to the music (the sound can be switched off with the speaker button). The first ones move your body or your face,
// the next ones make the CAMERA dance (it shakes, zooms, turns and splits on the beat).
const ALL_EFFECTS: { id: EffectId; emoji: string; needsFace: boolean; needsBody?: boolean; music: boolean }[] = [
  { id: "scan", emoji: "", needsFace: true, music: false },
  { id: "paint", emoji: "", needsFace: false, music: false },
  { id: "sym", emoji: "", needsFace: true, music: false },
  { id: "noir", emoji: "", needsFace: false, music: false },
  { id: "neon", emoji: "", needsFace: false, music: false },
  { id: "vhs", emoji: "", needsFace: false, music: false },
  { id: "pop", emoji: "", needsFace: false, music: false },
  { id: "dream", emoji: "", needsFace: false, music: false },
  { id: "cinema", emoji: "", needsFace: false, music: false },
  { id: "rock", emoji: "🎸", needsFace: true, music: true },
  { id: "hero", emoji: "🦸", needsFace: true, music: true },
  { id: "elastic", emoji: "🤪", needsFace: true, music: true },
  { id: "twins", emoji: "👯", needsFace: true, music: true },
  { id: "hips", emoji: "🌀", needsFace: false, needsBody: true, music: true },
  { id: "dance", emoji: "💃", needsFace: true, music: true },
  { id: "body", emoji: "🕺", needsFace: true, music: true },
  { id: "bighead", emoji: "🗿", needsFace: true, music: true },
  { id: "zoom", emoji: "🔍", needsFace: true, music: true },
  { id: "bulge", emoji: "🫠", needsFace: true, music: true },
  { id: "cam", emoji: "🎥", needsFace: false, music: true },
  { id: "echo", emoji: "👯", needsFace: false, music: true },
  { id: "kaleido", emoji: "🔮", needsFace: false, music: true },
  { id: "punch", emoji: "💥", needsFace: false, music: true },
  { id: "split", emoji: "🔲", needsFace: false, music: true },
  { id: "strobe", emoji: "⚡", needsFace: false, music: true },
  { id: "eyes", emoji: "👀", needsFace: true, music: true },
  { id: "mouth", emoji: "👄", needsFace: true, music: true },
  { id: "rainbow", emoji: "🌈", needsFace: true, music: true },
  { id: "fire", emoji: "🔥", needsFace: true, music: true },
  { id: "mirror", emoji: "🪞", needsFace: false, music: true },
  { id: "disco", emoji: "🪩", needsFace: false, music: true },
  { id: "glitch", emoji: "📺", needsFace: false, music: true },
  { id: "timewarp", emoji: "", needsFace: false, music: true },
  { id: "tiny", emoji: "", needsFace: true, music: true },
  { id: "morph", emoji: "", needsFace: true, music: true },
  { id: "cartoon", emoji: "", needsFace: true, music: true },
  { id: "baby", emoji: "", needsFace: true, music: true },
  { id: "alien", emoji: "", needsFace: true, music: true },
  { id: "grin", emoji: "", needsFace: true, music: true },
  { id: "longface", emoji: "", needsFace: true, music: true },
];
const WARPS: EffectId[] = ["morph", "cartoon", "baby", "alien", "grin", "longface"];

// The ones kept for now (chosen by the owner after trying them on the phone). The others stay written here, switched off, so they can come back or be redone.
// 2026-11-06: the owner wants FEW effects, all different and really funny (5 at most). The face-warp ones (facewarp.ts) and "sym" stay written, switched off.
const KEEP: EffectId[] = ["timewarp", "tiny", "bighead", "bulge", "scan"];
export const EFFECTS = KEEP.map((id) => ALL_EFFECTS.find((e) => e.id === id)!);

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const up = (f: Face) => ({ x: Math.sin(f.roll), y: -Math.cos(f.roll) }); // unit vector from chin to forehead
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function emoji(c: CanvasRenderingContext2D, ch: string, x: number, y: number, size: number, rot = 0, alpha = 1) {
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.rotate(rot);
  c.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(ch, 0, 0);
  c.restore();
}

function spawn(parts: Particle[], p: Partial<Particle> & { x: number; y: number }) {
  if (parts.length > 260) return;
  parts.push({ vx: 0, vy: 0, life: 0, max: 1, size: 20, g: 0, spin: 0, rot: 0, ...p });
}

/** Moves and draws the flying bits (fire, rainbow drops, confetti). */
export function stepParticles(f: Frame, dt: number) {
  const { c, parts } = f;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]!;
    p.life += dt;
    if (p.life >= p.max) { parts.splice(i, 1); continue; }
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.spin * dt;
    const k = 1 - p.life / p.max;
    if (p.ch) emoji(c, p.ch, p.x, p.y, p.size * (0.6 + 0.6 * k), p.rot, Math.min(1, k * 1.6));
    else {
      c.save();
      c.globalAlpha = Math.min(1, k * 1.6);
      c.fillStyle = p.color ?? "#fff";
      c.shadowColor = p.color ?? "#fff";
      c.shadowBlur = p.size * 0.8;
      c.beginPath();
      c.arc(p.x, p.y, p.size * (0.5 + 0.5 * k), 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }
}

const RAINBOW = ["#ff3b30", "#ff9500", "#ffd60a", "#34c759", "#0a84ff", "#5e5ce6", "#bf5af2"];

function confetti(f: Frame, x: number, y: number, n = 3) {
  for (let i = 0; i < n; i++) spawn(f.parts, { x: x + rnd(-40, 40), y, vx: rnd(-90, 90), vy: rnd(-260, -120), g: 520, max: rnd(1.1, 1.9), size: rnd(5, 9), color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)]! });
}

function tinted(base: HTMLCanvasElement, color: string, W: number, H: number) {
  const t = document.createElement("canvas");
  t.width = W;
  t.height = H;
  const x = t.getContext("2d")!;
  x.drawImage(base, 0, 0);
  x.globalCompositeOperation = "multiply";
  x.fillStyle = color;
  x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = "destination-in";
  x.drawImage(base, 0, 0);
  return t;
}

// ------------------------------------------------------------------ the head cut-out (the base of the dance effects)

/** The head: the face outline a little bigger, and moved up, so the hair and the forehead come along. */
function headPoly(f: Face, k = 1.16): Pt[] {
  const cx = f.oval.reduce((s, p) => s + p.x, 0) / f.oval.length;
  const cy = f.oval.reduce((s, p) => s + p.y, 0) / f.oval.length;
  const u = up(f);
  return f.oval.map((p) => ({ x: cx + (p.x - cx) * k + u.x * f.w * 0.12, y: cy + (p.y - cy) * k + u.y * f.w * 0.12 }));
}

function tracePoly(c: CanvasRenderingContext2D, pts: Pt[]) {
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  c.closePath();
}

/** Average skin colour of the face (used to hide the place the head moved away from, and for the hands of the dancer). */
let skinCanvas: HTMLCanvasElement | null = null;
let skinAt = 0;
let skinKept = "rgb(224,172,140)";
function skinOf(base: HTMLCanvasElement, f: Face): string {
  // reading pixels back from the picture stops the phone's graphics for a moment: it is done twice a second, not every frame
  const now = performance.now();
  if (now - skinAt < 500) return skinKept;
  skinAt = now;
  skinKept = skinRead(base, f);
  return skinKept;
}
function skinRead(base: HTMLCanvasElement, f: Face): string {
  skinCanvas ??= Object.assign(document.createElement("canvas"), { width: 1, height: 1 });
  const x = skinCanvas.getContext("2d", { willReadFrequently: true })!;
  const r = f.w * 0.16;
  try {
    x.drawImage(base, clamp(f.nose.x - r, 0, base.width - 2), clamp(f.nose.y + r * 0.2, 0, base.height - 2), Math.max(2, r * 2), Math.max(2, r), 0, 0, 1, 1);
    const d = x.getImageData(0, 0, 1, 1).data;
    return `rgb(${d[0]},${d[1]},${d[2]})`;
  } catch {
    return "rgb(224,172,140)";
  }
}

/** Draws the head cut out of the camera picture, moved / turned / scaled around a pivot point. */
function drawHead(f: Frame, fc: Face, o: { dx?: number; dy?: number; rot?: number; s?: number; sx?: number; sy?: number; pivot?: Pt }) {
  const { c, base } = f;
  const pv = o.pivot ?? fc.chin;
  c.save();
  c.translate(pv.x + (o.dx ?? 0), pv.y + (o.dy ?? 0));
  c.rotate(o.rot ?? 0);
  c.scale(o.sx ?? o.s ?? 1, o.sy ?? o.s ?? 1);
  c.translate(-pv.x, -pv.y);
  // soft edge: the outline is drawn blurred first, then the picture is clipped inside
  tracePoly(c, headPoly(fc));
  c.clip();
  c.drawImage(base, 0, 0);
  c.restore();
}

/** Hides the place the head left: the skin colour fades into the neck. */
function plug(f: Frame, fc: Face) {
  const { c } = f;
  const skin = skinOf(f.base, fc);
  tracePoly(c, headPoly(fc, 1.02));
  c.save();
  c.filter = "none";
  const g = c.createRadialGradient(fc.nose.x, fc.nose.y, fc.w * 0.1, fc.nose.x, fc.nose.y, fc.w * 0.75);
  g.addColorStop(0, skin);
  g.addColorStop(1, skin);
  c.fillStyle = g;
  c.globalAlpha = 0.96;
  c.fill();
  c.restore();
}

// ------------------------------------------------------------------ the dancer (your face on a dancing body)

function limb(c: CanvasRenderingContext2D, a: Pt, b: Pt, w: number, color: string) {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(b.x, b.y);
  c.stroke();
}
const pol = (o: Pt, len: number, ang: number): Pt => ({ x: o.x + Math.sin(ang) * len, y: o.y + Math.cos(ang) * len }); // angle 0 = straight down

type Look = { hoodie: string; dark: string; pants: string; shoe: string; cape?: string; mic?: boolean; emblem?: boolean };
const LOOKS: Record<"rock" | "hero", Look> = {
  rock: { hoodie: "#1b1b22", dark: "#0c0c10", pants: "#2a2a5a", shoe: "#e63946", mic: true },
  hero: { hoodie: "#1d4ed8", dark: "#1e3a8a", pants: "#dc2626", shoe: "#dc2626", cape: "#dc2626", emblem: true },
};

function drawDancer(f: Frame, fc: Face, look: Look | null = null) {
  const { c, bp, W, H } = f;
  const u = H * 0.058; // size of the dancer: a fixed part of the screen, so it always fits above the buttons
  const move = Math.floor(bp / 8) % 3;
  const sw = Math.sin(bp * Math.PI); // one swing every 2 beats
  const bounce = Math.abs(Math.sin(bp * Math.PI)) * u * 0.28;
  const hue = (bp * 11) % 360;
  const hoodie = look?.hoodie ?? `hsl(${(hue + 300) % 360},85%,58%)`;
  const dark = look?.dark ?? `hsl(${(hue + 300) % 360},85%,38%)`;
  const pants = look?.pants ?? `hsl(${(hue + 200) % 360},70%,42%)`;
  const skin = skinOf(f.base, fc);

  // the dancer stands in the middle of the screen, as big as the face allows, feet on the dance floor
  const cx = W / 2 + sw * u * 0.35;
  const feetY = H * 0.74;
  const bodyH = u * 6.2;
  const hipY = feetY - bodyH * 0.46 + bounce;
  const neck: Pt = { x: cx, y: hipY - bodyH * 0.38 };
  const hip: Pt = { x: cx + sw * u * 0.1, y: hipY };

  c.save();
  // shadow
  c.fillStyle = "rgba(0,0,0,.35)";
  c.beginPath();
  c.ellipse(cx, feetY + 6, u * 1.4, u * 0.22, 0, 0, Math.PI * 2);
  c.fill();
  // the hero's cape flaps behind the body
  if (look?.cape) {
    const flap = Math.sin(bp * Math.PI * 2) * u * 0.5;
    c.fillStyle = look.cape;
    c.beginPath();
    c.moveTo(neck.x - u * 0.7, neck.y + u * 0.2);
    c.lineTo(neck.x + u * 0.7, neck.y + u * 0.2);
    c.quadraticCurveTo(neck.x + u * 1.9 + flap, hip.y + u * 1.2, neck.x + u * 1.5 + flap * 1.4, hip.y + u * 3.2);
    c.lineTo(neck.x - u * 1.5 - flap * 1.4, hip.y + u * 3.2);
    c.quadraticCurveTo(neck.x - u * 1.9 - flap, hip.y + u * 1.2, neck.x - u * 0.7, neck.y + u * 0.2);
    c.fill();
  }
  // legs: they step on the beat
  const legL = 0.12 + sw * 0.38;
  const legR = -0.12 - sw * 0.38;
  for (const [side, ang, fx] of [[-1, legL, -0.4], [1, legR, 0.4]] as [number, number, number][]) {
    const h: Pt = { x: hip.x + fx * u * 0.6, y: hip.y };
    const knee = pol(h, bodyH * 0.24, ang * 0.9);
    const foot = pol(knee, bodyH * 0.24, ang * 0.35 + side * 0.04);
    limb(c, h, knee, u * 0.62, pants);
    limb(c, knee, foot, u * 0.56, pants);
    c.fillStyle = look?.shoe ?? "#fff";
    c.beginPath();
    c.ellipse(foot.x + side * u * 0.14, foot.y + u * 0.06, u * 0.46, u * 0.22, 0, 0, Math.PI * 2);
    c.fill();
  }
  // body
  limb(c, hip, neck, u * 1.7, hoodie);
  limb(c, { x: hip.x, y: hip.y - u * 0.05 }, { x: hip.x, y: hip.y + u * 0.15 }, u * 1.55, dark);
  // arms: three dances, one after the other (floss, pumping arms, disco point)
  const sh = (side: number): Pt => ({ x: neck.x + side * u * 0.78, y: neck.y + u * 0.34 });
  const arm = (side: number): [Pt, Pt] => {
    const s0 = sh(side);
    let a1 = 0;
    let a2 = 0;
    if (move === 0) { a1 = sw * 1.15; a2 = a1 + 0.5 * Math.sign(sw || 1) ; } // floss: both arms swing together
    else if (move === 1) {
      const lift = Math.max(0, side * sw); // pump: the arms go up one after the other
      a1 = side * (0.25 + (1 - lift) * 0.25) + Math.PI * lift * 0.85 * side;
      a2 = a1 + side * 0.4 * (1 - lift);
    } else {
      const point = Math.sin(bp * Math.PI * 0.5) * side > 0; // disco: one arm points up, the other on the hip
      a1 = point ? side * (Math.PI * 0.72) : side * 0.7;
      a2 = point ? a1 : side * 2.6;
    }
    const e = pol(s0, u * 1.55, a1);
    const hand = pol(e, u * 1.4, a2);
    return [e, hand];
  };
  for (const side of [-1, 1]) {
    const [e, hand] = arm(side);
    limb(c, sh(side), e, u * 0.6, hoodie);
    limb(c, e, hand, u * 0.54, hoodie);
    c.fillStyle = skin;
    c.beginPath();
    c.arc(hand.x, hand.y, u * 0.36, 0, Math.PI * 2);
    c.fill();
  }
  if (look?.emblem) {
    c.fillStyle = "#fde047";
    c.beginPath();
    c.arc(neck.x, neck.y + bodyH * 0.14, u * 0.4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#dc2626";
    c.font = `${u * 0.55}px sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("★", neck.x, neck.y + bodyH * 0.14 + 2);
  }
  if (look?.mic) {
    const [, hand] = arm(1);
    c.strokeStyle = "#cbd5e1";
    c.lineWidth = u * 0.16;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(hand.x, hand.y);
    c.lineTo(hand.x + u * 0.1, hand.y - u * 0.7);
    c.stroke();
    c.fillStyle = "#94a3b8";
    c.beginPath();
    c.arc(hand.x + u * 0.1, hand.y - u * 0.85, u * 0.26, 0, Math.PI * 2);
    c.fill();
  }
  // neck
  limb(c, neck, { x: neck.x, y: neck.y - u * 0.5 }, u * 0.5, skin);
  c.restore();

  // the head: YOUR face, big, on top of the dancer, nodding on the beat
  const nod = Math.sin(bp * Math.PI) * 0.16;
  const s = clamp((u * 2.3) / fc.w, 0.6, 4);
  const pivot = fc.chin;
  c.save();
  const dx = neck.x - pivot.x;
  const dy = neck.y - u * 0.15 - pivot.y - bounce * 0.4;
  drawHead(f, fc, { dx, dy, rot: nod, s, pivot });
  c.restore();
}

function danceFloor(f: Frame) {
  const { c, W, H, t, beat } = f;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#12002b");
  g.addColorStop(0.55, "#2a0a5a");
  g.addColorStop(1, "#0b0120");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // glowing tiles
  const rows = 6;
  const cols = 8;
  const y0 = H * 0.62;
  for (let r = 0; r < rows; r++) {
    const y1 = y0 + (H - y0) * (r / rows) ** 1.6;
    const y2 = y0 + (H - y0) * ((r + 1) / rows) ** 1.6;
    for (let k = 0; k < cols; k++) {
      const x1a = W * (k / cols - 0.5) * (0.35 + 0.65 * (r / rows)) + W / 2;
      const x2a = W * ((k + 1) / cols - 0.5) * (0.35 + 0.65 * (r / rows)) + W / 2;
      const x1b = W * (k / cols - 0.5) * (0.35 + 0.65 * ((r + 1) / rows)) + W / 2;
      const x2b = W * ((k + 1) / cols - 0.5) * (0.35 + 0.65 * ((r + 1) / rows)) + W / 2;
      c.fillStyle = `hsla(${(t * 70 + (r + k) * 30) % 360},90%,${45 + 14 * ((r + k + Math.floor(f.bp)) % 2)}%,${0.35 + 0.35 * beat})`;
      c.beginPath();
      c.moveTo(x1a, y1);
      c.lineTo(x2a, y1);
      c.lineTo(x2b, y2);
      c.lineTo(x1b, y2);
      c.fill();
    }
  }
  c.save();
  c.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) {
    const gr = c.createLinearGradient(0, 0, 0, H * 0.75);
    gr.addColorStop(0, `hsla(${(t * 80 + i * 90) % 360},100%,60%,${0.16 + beat * 0.3})`);
    gr.addColorStop(1, "transparent");
    c.fillStyle = gr;
    const x0 = W * (0.1 + i * 0.27);
    c.beginPath();
    c.moveTo(x0, 0);
    c.lineTo(x0 - 70 + Math.sin(t * 1.7 + i * 2) * 120, H * 0.75);
    c.lineTo(x0 + 70 + Math.sin(t * 1.7 + i * 2) * 120, H * 0.75);
    c.fill();
  }
  c.restore();
}

// the last pictures kept for the echo effect (small, so it stays light on the phone)
const ECHO: HTMLCanvasElement[] = [];
let echoAt = 0;
function echoHist(base: HTMLCanvasElement, W: number, H: number, t: number): HTMLCanvasElement[] {
  if (t - echoAt > 0.09) {
    echoAt = t;
    const h = ECHO.length >= 6 ? ECHO.shift()! : document.createElement("canvas");
    h.width = W;
    h.height = H;
    h.getContext("2d")!.drawImage(base, 0, 0);
    ECHO.push(h);
  }
  return ECHO;
}

function stageBackground(f: Frame) {
  const { c, W, H, t, beat, bp } = f;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#14040a");
  g.addColorStop(0.6, "#3a0a18");
  g.addColorStop(1, "#0a0204");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.save();
  c.globalCompositeOperation = "lighter";
  for (let i = 0; i < 5; i++) {
    const x0 = W * (0.1 + i * 0.2);
    const gr = c.createLinearGradient(0, 0, 0, H * 0.8);
    gr.addColorStop(0, i % 2 ? `rgba(255,214,120,${0.18 + beat * 0.3})` : `rgba(255,255,255,${0.12 + beat * 0.3})`);
    gr.addColorStop(1, "transparent");
    c.fillStyle = gr;
    c.beginPath();
    c.moveTo(x0, 0);
    c.lineTo(x0 - 90 + Math.sin(t * 1.4 + i * 1.7) * 150, H * 0.8);
    c.lineTo(x0 + 90 + Math.sin(t * 1.4 + i * 1.7) * 150, H * 0.8);
    c.fill();
  }
  c.restore();
  // stage floor with boards
  c.fillStyle = "#1a0d08";
  c.fillRect(0, H * 0.74, W, H * 0.26);
  c.strokeStyle = "rgba(255,200,120,.12)";
  for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(0, H * 0.74 + i * H * 0.03); c.lineTo(W, H * 0.74 + i * H * 0.03); c.stroke(); }
  // the crowd: dark heads and raised hands in front, jumping on the beat
  c.fillStyle = "#050205";
  for (let i = 0; i < 10; i++) {
    const x = (W / 9) * i;
    const y = H * 0.93 + Math.abs(Math.sin(bp * Math.PI + i)) * -10;
    c.beginPath();
    c.arc(x, y, W * 0.055, 0, Math.PI * 2);
    c.fill();
    c.fillRect(x - W * 0.012, y - W * 0.16 - Math.sin(bp * Math.PI * 2 + i) * 12, W * 0.024, W * 0.12);
  }
}

function cityBackground(f: Frame) {
  const { c, W, H, t, beat } = f;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#050b2a");
  g.addColorStop(0.7, "#3b1a63");
  g.addColorStop(1, "#16062b");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(255,255,255,${0.35 + 0.5 * Math.abs(Math.sin(t * 2 + i))})`;
    c.fillRect(((i * 97) % 100) * (W / 100), ((i * 53) % 55) * (H / 100), 3, 3);
  }
  c.fillStyle = "#fef3c7";
  c.beginPath();
  c.arc(W * 0.78, H * 0.16, W * 0.09, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#0b0720";
  for (let i = 0; i < 9; i++) {
    const bw = W / 8;
    const bh = H * (0.22 + ((i * 37) % 17) / 100);
    c.fillRect(i * bw - 6, H * 0.74 - bh, bw - 8, bh);
    for (let k = 0; k < 14; k++) {
      c.fillStyle = (i * 7 + k) % 3 ? "rgba(253,224,71,.8)" : "rgba(30,20,60,.9)";
      c.fillRect(i * bw + 6 + (k % 3) * 22, H * 0.74 - bh + 14 + Math.floor(k / 3) * 26, 12, 14);
    }
    c.fillStyle = "#0b0720";
  }
  c.fillStyle = `hsl(${(t * 30) % 360},40%,${14 + beat * 8}%)`;
  c.fillRect(0, H * 0.74, W, H * 0.26);
  c.fillStyle = "rgba(255,255,255,.1)";
  c.fillRect(0, H * 0.74, W, 3);
}

// ------------------------------------------------------------------ the picture itself

/** The picture: plain for most effects, bent, shaken, zoomed or replaced by a dance floor for the others. */
let grainTile: HTMLCanvasElement | null = null;
function grain(c: CanvasRenderingContext2D, W: number, H: number, a: number) {
  if (!grainTile) {
    grainTile = document.createElement("canvas");
    grainTile.width = grainTile.height = 128;
    const g = grainTile.getContext("2d")!;
    const d = g.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
  }
  c.save();
  c.globalAlpha = a;
  c.globalCompositeOperation = "overlay";
  const ox = -Math.floor(Math.random() * 128), oy = -Math.floor(Math.random() * 128);
  for (let x = ox; x < W; x += 128) for (let y = oy; y < H; y += 128) c.drawImage(grainTile, x, y);
  c.restore();
}
function vignette(c: CanvasRenderingContext2D, W: number, H: number, a: number) {
  const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${a})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}
function tint(c: CanvasRenderingContext2D, W: number, H: number, mode: GlobalCompositeOperation, fill: string | CanvasGradient, a = 1) {
  c.save();
  c.globalCompositeOperation = mode;
  c.globalAlpha = a;
  c.fillStyle = fill;
  c.fillRect(0, 0, W, H);
  c.restore();
}
const TESS = FaceLandmarker.FACE_LANDMARKS_TESSELATION;
const CONT = [FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, FaceLandmarker.FACE_LANDMARKS_LIPS, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW];
function verdict(fc: Face): string {
  if (fc.open > 0.55) return "SORPRESA TOTALE";
  if (fc.smile > 0.6) return "SORRISO DA COPERTINA";
  if (fc.smile > 0.3) return "SORRISO DI CIRCOSTANZA";
  if (fc.brow > 0.45) return "SOPRACCIGLIO: SOSPETTO";
  return "FACCIA NEUTRA: IMPENETRABILE";
}
/** The expression scanner: a glowing mesh sticks to your face, a beam sweeps it, and a verdict reads your mood (smile, surprise, doubt). */
function drawScan(f: Frame): boolean {
  const { c, base, W, H, t } = f;
  c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  c.drawImage(base, 0, 0);
  const fc = f.faces[0];
  tint(c, W, H, "multiply", "#7fa8c8", 0.55);
  vignette(c, W, H, 0.55);
  if (!fc?.mesh) return true;
  const m = fc.mesh;
  c.save();
  c.lineWidth = 0.8;
  c.strokeStyle = "rgba(80,230,255,.30)";
  c.beginPath();
  for (const e of TESS) { c.moveTo(m[e.start]!.x, m[e.start]!.y); c.lineTo(m[e.end]!.x, m[e.end]!.y); }
  c.stroke();
  c.globalCompositeOperation = "lighter";
  for (const [w, a] of [[4, 0.18], [1.6, 0.95]] as const) {
    c.lineWidth = w; c.strokeStyle = `rgba(120,255,235,${a})`;
    c.beginPath();
    for (const set of CONT) for (const e of set) { c.moveTo(m[e.start]!.x, m[e.start]!.y); c.lineTo(m[e.end]!.x, m[e.end]!.y); }
    c.stroke();
  }
  // the beam that sweeps over the face
  const top = fc.fore.y - fc.w * 0.1, h = fc.chin.y - top + fc.w * 0.1;
  const by = top + ((t * 0.7) % 1) * h;
  const g = c.createLinearGradient(0, by - 26, 0, by + 4);
  g.addColorStop(0, "rgba(100,255,230,0)"); g.addColorStop(1, "rgba(160,255,240,.55)");
  c.fillStyle = g;
  c.fillRect(fc.nose.x - fc.w * 0.8, by - 26, fc.w * 1.6, 30);
  c.restore();
  // readings
  const bars: [string, number][] = [["SORRISO", fc.smile], ["STUPORE", fc.open], ["DUBBIO", Math.min(1, fc.brow * 1.5)]];
  const x0 = Math.max(14, fc.nose.x - fc.w * 0.95), y0 = fc.fore.y;
  c.font = `600 ${Math.round(W * 0.028)}px ui-monospace, Menlo, monospace`;
  c.textAlign = "left";
  bars.forEach(([name, v], i) => {
    const y = y0 + i * W * 0.07, bw = W * 0.2;
    c.fillStyle = "rgba(160,255,240,.95)"; c.fillText(name, x0, y);
    c.fillStyle = "rgba(100,255,230,.2)"; c.fillRect(x0, y + 5, bw, 6);
    c.fillStyle = "rgba(120,255,235,.95)"; c.fillRect(x0, y + 5, bw * Math.min(1, v), 6);
  });
  c.textAlign = "center";
  c.font = `700 ${Math.round(W * 0.042)}px ui-monospace, Menlo, monospace`;
  c.fillStyle = "rgba(0,20,30,.55)";
  const label = verdict(fc), lw = c.measureText(label).width + 28;
  c.fillRect(W / 2 - lw / 2, H * 0.9 - W * 0.05, lw, W * 0.075);
  c.fillStyle = "#8ffff0";
  c.fillText(label, W / 2, H * 0.9);
  return true;
}
/** A museum portrait: you in oil paint, in a gilded frame; the plaque on the wall changes with your expression. */
function drawPaint(f: Frame): boolean {
  const { c, base, W, H } = f;
  const fc = f.faces[0];
  const s = document.createElement("canvas");
  s.width = Math.round(W / 7); s.height = Math.round(H / 7);
  s.getContext("2d")!.drawImage(base, 0, 0, s.width, s.height);
  c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  c.imageSmoothingEnabled = true;
  c.drawImage(s, 0, 0, W, H);
  c.save(); c.globalAlpha = 0.45; c.drawImage(base, 0, 0); c.restore();
  tint(c, W, H, "saturation", "#000", 0.25);
  tint(c, W, H, "soft-light", "#c98a3c", 0.75);
  tint(c, W, H, "multiply", "#d9c3a0", 0.55);
  grain(c, W, H, 0.3);
  vignette(c, W, H, 0.6);
  const fr = W * 0.055;
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#f7dc7a"); g.addColorStop(0.3, "#9a6b17"); g.addColorStop(0.55, "#ffe9a0"); g.addColorStop(0.8, "#8a5a10"); g.addColorStop(1, "#f2cf6a");
  c.fillStyle = g;
  c.fillRect(0, 0, W, fr); c.fillRect(0, H - fr, W, fr); c.fillRect(0, 0, fr, H); c.fillRect(W - fr, 0, fr, H);
  c.strokeStyle = "rgba(60,35,0,.7)"; c.lineWidth = 3;
  c.strokeRect(fr, fr, W - 2 * fr, H - 2 * fr); c.strokeRect(2, 2, W - 4, H - 4);
  const title = !fc ? "Ritratto di Sconosciuto" : fc.open > 0.55 ? "L'Urlo di Bra" : fc.smile > 0.45 ? "La Gioconda di Bra" : fc.brow > 0.45 ? "Il Sospettoso" : "Ritratto di Gentiluomo";
  const pw = W * 0.62, ph = W * 0.13, px = (W - pw) / 2, py = H - fr - ph - 18;
  c.fillStyle = "#e9c75a"; c.fillRect(px, py, pw, ph);
  c.strokeStyle = "#6b4a0c"; c.lineWidth = 2; c.strokeRect(px + 3, py + 3, pw - 6, ph - 6);
  c.fillStyle = "#2b1a02"; c.textAlign = "center";
  c.font = `italic 700 ${Math.round(W * 0.04)}px Georgia, serif`; c.fillText(title, W / 2, py + ph * 0.45);
  c.font = `${Math.round(W * 0.027)}px Georgia, serif`; c.fillText("olio su tela · Bra, " + new Date().getFullYear(), W / 2, py + ph * 0.78);
  return true;
}
/** Perfect symmetry: one half of your face is copied onto the other, and the side switches every few seconds. Unsettling, and very funny. */
function drawSym(f: Frame): boolean {
  const { c, base, W, H, t } = f;
  c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  c.drawImage(base, 0, 0);
  const ax = f.faces[0] ? f.smooth.x : W / 2;
  const left = Math.floor(t / 3) % 2 === 0;
  c.save();
  c.beginPath();
  if (left) c.rect(ax, 0, W - ax, H); else c.rect(0, 0, ax, H);
  c.clip();
  c.translate(2 * ax, 0); c.scale(-1, 1);
  c.drawImage(base, 0, 0);
  c.restore();
  c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(ax - 1, 0, 2, H);
  return true;
}

/** The "looks": photo grades for grown-ups (no characters, no music). Plain canvas blending, so they are cheap and never stall the phone. */
function drawLook(id: EffectId, f: Frame): boolean {
  const { c, base, W, H, t } = f;
  const plain = () => { c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; c.drawImage(base, 0, 0); };
  if (id === "scan") return drawScan(f);
  if (id === "paint") return drawPaint(f);
  if (id === "sym") return drawSym(f);
  if (id === "noir") {
    plain();
    tint(c, W, H, "saturation", "#000");
    tint(c, W, H, "overlay", "#808080", 0.55);
    tint(c, W, H, "multiply", "#e8e8ee", 1);
    grain(c, W, H, 0.22);
    vignette(c, W, H, 0.7);
    c.fillStyle = "#000";
    const bar = H * 0.085;
    c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar);
    return true;
  }
  if (id === "neon") {
    plain();
    tint(c, W, H, "saturation", "#000", 0.85);
    const g = c.createLinearGradient(0, 0, W, H);
    const sh = (Math.sin(t * 0.6) + 1) / 2;
    g.addColorStop(0, "#ff2bd6"); g.addColorStop(0.5 + sh * 0.2, "#6a3dff"); g.addColorStop(1, "#00e5ff");
    tint(c, W, H, "color", g, 0.9);
    tint(c, W, H, "overlay", g, 0.5);
    tint(c, W, H, "overlay", "#808080", 0.4);
    vignette(c, W, H, 0.55);
    return true;
  }
  if (id === "vhs") {
    plain();
    c.save();
    c.globalCompositeOperation = "lighter";
    c.globalAlpha = 0.28;
    const sh = 5 + Math.sin(t * 7) * 2;
    c.drawImage(tinted(base, "#ff0a3c", W, H), -sh, 0);
    c.drawImage(tinted(base, "#00d8ff", W, H), sh, 0);
    c.restore();
    tint(c, W, H, "soft-light", "#ffb060", 0.5);
    c.fillStyle = "rgba(0,0,0,.16)";
    for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1.5);
    const by = ((t * 90) % (H + 80)) - 40;
    c.fillStyle = "rgba(255,255,255,.06)";
    c.fillRect(0, by, W, 38);
    grain(c, W, H, 0.18);
    vignette(c, W, H, 0.45);
    c.fillStyle = "#fff";
    c.font = `600 ${Math.round(W * 0.05)}px ui-monospace, Menlo, monospace`;
    c.shadowColor = "rgba(255,0,60,.8)"; c.shadowBlur = 0; c.shadowOffsetX = 2;
    c.textAlign = "left";
    c.fillText("▶ PLAY", W * 0.06, H * 0.08);
    c.fillText("BRA  " + new Date().toLocaleDateString("it-IT").replace(/\/\d{4}$/, "/89"), W * 0.06, H * 0.94);
    c.shadowOffsetX = 0;
    return true;
  }
  if (id === "pop") {
    const cols = ["#ff2e7e", "#00c2ff", "#ffd400", "#7cff4f"];
    cols.forEach((col, i) => {
      const x = (i % 2) * (W / 2), y = Math.floor(i / 2) * (H / 2);
      c.save();
      c.beginPath(); c.rect(x, y, W / 2, H / 2); c.clip();
      c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
      c.drawImage(base, x, y, W / 2, H / 2);
      c.restore();
      c.save();
      c.beginPath(); c.rect(x, y, W / 2, H / 2); c.clip();
      tint(c, W, H, "saturation", "#000", 1);
      tint(c, W, H, "overlay", "#808080", 0.6);
      tint(c, W, H, "multiply", col, 0.9);
      c.restore();
    });
    return true;
  }
  if (id === "dream") {
    plain();
    const s = document.createElement("canvas");
    s.width = Math.round(W / 14); s.height = Math.round(H / 14);
    s.getContext("2d")!.drawImage(base, 0, 0, s.width, s.height);
    c.save();
    c.globalCompositeOperation = "screen";
    c.globalAlpha = 0.5 + Math.sin(t * 1.2) * 0.08;
    c.imageSmoothingEnabled = true;
    c.drawImage(s, 0, 0, W, H);
    c.restore();
    tint(c, W, H, "soft-light", "#ffb7d5", 0.55);
    tint(c, W, H, "screen", "#2a1030", 0.12);
    vignette(c, W, H, 0.25);
    return true;
  }
  if (id === "cinema") {
    plain();
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#ff9a3c"); g.addColorStop(1, "#0a6c8c");
    tint(c, W, H, "soft-light", g, 0.9);
    tint(c, W, H, "overlay", "#808080", 0.35);
    grain(c, W, H, 0.12);
    vignette(c, W, H, 0.5);
    c.fillStyle = "#000";
    const bar = H * 0.12;
    c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar);
    c.fillStyle = "rgba(255,255,255,.85)";
    c.font = `300 ${Math.round(W * 0.05)}px Georgia, serif`;
    c.textAlign = "center";
    c.fillText("B R A", W / 2, H - bar / 2 + W * 0.018);
    return true;
  }
  return false;
}

export function drawBase(id: EffectId, f: Frame) {
  const { c, base, W, H, t } = f;
  if (WARPS.includes(id)) { drawWarp(id as WarpId, f); return; }
  if (id === "timewarp") { drawTimeWarp(f); return; }
  if (drawLook(id, f)) return;
  const fc = f.faces[0];
  if (id === "body" && fc) { danceFloor(f); return; }
  if (id === "rock" && fc) { stageBackground(f); return; }
  if (id === "hero" && fc) { cityBackground(f); return; }
  if (id === "zoom" && fc) {
    // Face Zoom: the camera holds your face in the middle, zooms in on the beat and leans with your head: the camera dances with you
    const s = 1.55 + 0.34 * f.beat + clamp(120 / f.smooth.w, 0, 1.2) * 0.4;
    c.save();
    c.translate(W / 2, H / 2 + Math.sin(f.bp * Math.PI) * 10);
    c.rotate(-f.smooth.roll * 0.55 + Math.sin(f.bp * Math.PI * 0.5) * 0.045);
    c.scale(s, s);
    c.translate(-f.smooth.x, -f.smooth.y);
    c.drawImage(base, 0, 0);
    c.restore();
    return;
  }
  if (id === "hips") {
    // The hips dance: the middle of the body slides left and right and pushes forward on the beat, while the shoulders and the legs stay where they are.
    // The picture is cut in thin horizontal strips and each strip is moved a little more the closer it is to the hips.
    let hipY: number;
    let hipX: number;
    let reach: number; // how tall the part that moves is
    let width: number;
    if (f.pose) {
      const p = f.pose;
      hipY = (p.hipL.y + p.hipR.y) / 2;
      hipX = (p.hipL.x + p.hipR.x) / 2;
      width = Math.max(60, Math.abs(p.hipL.x - p.hipR.x) * 1.6, Math.abs(p.shL.x - p.shR.x) * 0.9);
      reach = Math.max(90, (hipY - (p.shL.y + p.shR.y) / 2) * 0.85);
    } else if (fc) {
      // no body found (too close): a guess from the face, so the effect still moves something
      hipY = fc.chin.y + fc.w * 3.4;
      hipX = fc.nose.x;
      width = fc.w * 1.5;
      reach = fc.w * 2.2;
    } else {
      c.drawImage(base, 0, 0);
      return;
    }
    const sway = Math.sin(f.bp * Math.PI); // left-right once every 2 beats
    const thrust = Math.abs(Math.cos(f.bp * Math.PI)); // forward on every beat
    const amp = width * 0.62;
    const h = 4;
    for (let y = 0; y < H; y += h) {
      const d = (y + h / 2 - hipY) / reach;
      const g = Math.exp(-d * d * 2.4);
      const sc = 1 + 0.12 * thrust * g;
      const dx = sway * amp * g + (hipX - hipX * sc);
      c.drawImage(base, 0, y, W, h, dx, y, W * sc, h + 0.6);
    }
    return;
  }
  if (id === "cam") {
    // the camera dances: it sways, leans, bobs and shakes on the kick
    c.save();
    c.translate(W / 2, H / 2);
    c.rotate(Math.sin(f.bp * Math.PI * 0.5) * 0.06 + (Math.random() - 0.5) * 0.012 * f.beat);
    const s = 1.1 + 0.1 * f.beat;
    c.scale(s, s);
    c.translate(Math.sin(f.bp * Math.PI) * W * 0.035 + (Math.random() - 0.5) * 10 * f.beat, -f.beat * H * 0.018 + Math.abs(Math.sin(f.bp * Math.PI)) * H * 0.01);
    c.drawImage(base, -W / 2, -H / 2);
    c.restore();
    return;
  }
  if (id === "punch") {
    // beat zoom: a quick punch-in on every beat with a flash of colour, like the edits on TikTok
    const k = f.beat ** 1.4;
    c.save();
    c.translate(W / 2, H / 2);
    c.rotate((Math.random() - 0.5) * 0.015 * k);
    const s = 1 + 0.2 * k;
    c.scale(s, s);
    c.drawImage(base, -W / 2, -H / 2);
    c.restore();
    if (k > 0.25) {
      c.save();
      c.globalCompositeOperation = "lighter";
      c.globalAlpha = 0.45 * k;
      const j = 10 * k;
      c.drawImage(tinted(base, "#ff0040", W, H), -j, 0);
      c.drawImage(tinted(base, "#00e5ff", W, H), j, 0);
      c.restore();
    }
    return;
  }
  if (id === "kaleido") {
    // a kaleidoscope that turns and pulses with the music
    const n = 8;
    const R = Math.hypot(W, H) / 2;
    const half = Math.PI / n;
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);
    for (let k = 0; k < n; k++) {
      c.save();
      c.translate(W / 2, H / 2);
      c.rotate((k * 2 * Math.PI) / n + f.bp * 0.08);
      if (k % 2) c.scale(1, -1);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(R * Math.cos(-half), R * Math.sin(-half));
      c.lineTo(R * Math.cos(half), R * Math.sin(half));
      c.closePath();
      c.clip();
      const s = 1.15 + 0.12 * f.beat;
      c.rotate(-f.bp * 0.08);
      c.scale(s, s);
      c.drawImage(base, -W / 2, -H / 2);
      c.restore();
    }
    return;
  }
  if (id === "echo") {
    // dancing clones: the last moments of the picture stay behind you as ghosts that swing with the music
    const hist = echoHist(base, W, H, f.t);
    c.drawImage(base, 0, 0);
    c.save();
    c.globalCompositeOperation = "screen";
    hist.forEach((h, i) => {
      const k = (i + 1) / (hist.length + 1);
      c.globalAlpha = 0.18 + 0.12 * f.beat;
      c.drawImage(h, Math.sin(f.bp * Math.PI) * W * 0.09 * (1 - k) + (i - hist.length / 2) * 6, 0, W, H);
    });
    c.restore();
    c.drawImage(base, 0, 0);
    return;
  }
  if (id === "split") {
    // four pictures, flipped one against the other, that swap on the beat
    const flip = Math.floor(f.bp / 2) % 2;
    const hw = W / 2;
    const hh = H / 2;
    const z = 1 + 0.06 * f.beat;
    for (let i = 0; i < 4; i++) {
      const gx = i % 2;
      const gy = i >> 1;
      c.save();
      c.beginPath();
      c.rect(gx * hw, gy * hh, hw, hh);
      c.clip();
      c.translate(gx * hw + hw / 2, gy * hh + hh / 2);
      c.scale((gx ^ flip ? -1 : 1) * 0.5 * z, (gy ^ flip ? -1 : 1) * 0.5 * z);
      c.drawImage(base, -W / 2, -H / 2);
      c.restore();
    }
    return;
  }
  if (id === "strobe") {
    c.drawImage(base, 0, 0);
    if (f.beat > 0.5) {
      c.save();
      c.globalCompositeOperation = "difference";
      c.fillStyle = `rgba(255,255,255,${0.55 * f.beat})`;
      c.fillRect(0, 0, W, H);
      c.restore();
    }
    c.save();
    c.globalCompositeOperation = "overlay";
    c.fillStyle = `hsla(${(f.bp * 45) % 360},100%,55%,${0.12 + 0.3 * f.beat})`;
    c.fillRect(0, 0, W, H);
    c.restore();
    return;
  }
  if (id === "mirror") {
    const h = 6;
    for (let y = 0; y < H; y += h) {
      const s = 1 + (0.3 + 0.2 * f.beat) * Math.sin((y / H) * Math.PI * 2.2 + f.bp * Math.PI * 0.8);
      const dx = Math.sin(y / 40 - f.bp * 1.5) * (10 + 14 * f.beat);
      c.drawImage(base, 0, y, W, h, (W - W * s) / 2 + dx, y, W * s, h + 0.5);
    }
    return;
  }
  if (id === "disco") {
    c.save();
    c.translate(W / 2, H / 2);
    c.rotate(Math.sin(t * 6) * 0.012 * (0.4 + f.beat));
    const s = 1 + 0.07 * f.beat;
    c.scale(s, s);
    c.drawImage(base, -W / 2, -H / 2);
    c.restore();
    c.save();
    c.globalCompositeOperation = "overlay";
    c.fillStyle = `hsla(${(t * 90) % 360},95%,58%,${0.22 + 0.35 * f.beat})`;
    c.fillRect(0, 0, W, H);
    c.restore();
    return;
  }
  if (id === "glitch") {
    const j = 3 + Math.random() * 6 + 16 * f.beat;
    c.drawImage(base, 0, 0);
    c.save();
    c.globalCompositeOperation = "lighter";
    c.globalAlpha = 0.55;
    c.drawImage(tinted(base, "#ff0040", W, H), -j, 0);
    c.drawImage(tinted(base, "#00e5ff", W, H), j, 0);
    c.restore();
    for (let i = 0; i < 4; i++) {
      if (Math.random() < 0.3 + 0.6 * f.beat) {
        const y = Math.random() * H;
        const h = rnd(8, 46);
        c.drawImage(base, 0, y, W, h, rnd(-34, 34), y, W, h);
      }
    }
    c.fillStyle = "rgba(0,0,0,.14)";
    for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1.5);
    return;
  }
  c.drawImage(base, 0, 0);
}

// ------------------------------------------------------------------ what is drawn on top

export function drawOverlay(id: EffectId, f: Frame, dt: number) {
  const { c, base, t, bp } = f;

  for (const fc of f.faces) {
    const u = up(fc);

    if (id === "dance") {
      // only the head dances: it slides, tilts, nods and jumps on the beat, the body stays still
      plug(f, fc);
      const bar = Math.floor(bp / 4) % 3; // three head dances, one after the other
      const sw = Math.sin(bp * Math.PI);
      const dxv = bar === 0 ? sw * fc.w * 0.34 : bar === 1 ? Math.sin(bp * Math.PI * 2) * fc.w * 0.12 : Math.sin(bp * Math.PI * 0.5) * fc.w * 0.45;
      const dyv = -Math.abs(bar === 1 ? Math.sin(bp * Math.PI * 2) : sw) * fc.w * 0.2 + f.beat * fc.w * 0.04;
      const rot = bar === 0 ? sw * 0.38 : bar === 1 ? Math.sin(bp * Math.PI * 2) * 0.2 : sw * 0.55;
      drawHead(f, fc, { dx: dxv, dy: dyv, rot, s: 1.04 + 0.2 * f.beat });
    }

    if (id === "tiny") tinyHead(f, fc, plug, drawHead);

    if (id === "bighead") {
      // the "big head" filter: a huge head on a tiny body, nodding to the music
      const nod = Math.sin(bp * Math.PI) * 0.12;
      drawHead(f, fc, { rot: nod, s: 1.9 + 0.22 * f.beat, dy: Math.abs(Math.sin(bp * Math.PI)) * -fc.w * 0.05 });
    }

    if (id === "body") drawDancer(f, fc);
    if (id === "rock") drawDancer(f, fc, LOOKS.rock);
    if (id === "hero") drawDancer(f, fc, LOOKS.hero);

    if (id === "elastic") {
      // a rubber face: it stretches long and thin, then short and wide, on the beat; everything else stays as it is
      plug(f, fc);
      const w = Math.sin(bp * Math.PI * 0.5); // slow swing between long and wide
      const k = 0.45 + 0.1 * f.beat;
      drawHead(f, fc, { sx: 1 - w * k * 0.55, sy: 1 + w * k * 1.1, rot: Math.sin(bp * Math.PI) * 0.1 });
    }

    if (id === "twins") {
      // three of you: the heads dance one after the other, like a canon, while the body stays
      plug(f, fc);
      const gap = fc.w * 1.12;
      for (const i of [-1, 1, 0]) {
        const ph = bp * Math.PI - (i === 0 ? 0 : i * 1.1);
        const room = Math.min(gap, i < 0 ? fc.chin.x - fc.w * 0.45 : f.W - fc.chin.x - fc.w * 0.45);
        drawHead(f, fc, { dx: i * Math.max(0, room), dy: -Math.abs(Math.sin(ph)) * fc.w * 0.22, rot: Math.sin(ph) * 0.36, s: i === 0 ? 1.08 : 0.88 });
      }
    }

    if (id === "bulge") {
      // the face swells and shrinks on the beat, like a rubber mask
      const R = fc.w * 0.95;
      const n = 8;
      const A = 0.55 + 0.9 * f.beat;
      for (let i = 0; i <= n; i++) {
        const r = R * (1 - i / (n + 1));
        const k = 1 + A * (1 - r / R) ** 1.4;
        const cx = fc.nose.x;
        const cy = fc.nose.y;
        c.save();
        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);
        c.clip();
        c.drawImage(base, cx - r / k, cy - r / k, (2 * r) / k, (2 * r) / k, cx - r, cy - r, 2 * r, 2 * r);
        c.restore();
      }
      c.beginPath();
      c.arc(fc.nose.x, fc.nose.y, R, 0, Math.PI * 2);
      c.strokeStyle = "rgba(255,255,255,.18)";
      c.lineWidth = 3;
      c.stroke();
    }

    if (id === "eyes") {
      const r = fc.w * 0.12;
      const k = 1.9 + fc.brow * 0.6 + 0.7 * f.beat; // the eyes pop on every beat
      for (const e of [fc.eyeA, fc.eyeB]) {
        c.save();
        c.beginPath();
        c.arc(e.x, e.y, r * k, 0, Math.PI * 2);
        c.clip();
        c.drawImage(base, e.x - r, e.y - r, r * 2, r * 2, e.x - r * k, e.y - r * k, r * 2 * k, r * 2 * k);
        c.restore();
        c.beginPath();
        c.arc(e.x, e.y, r * k, 0, Math.PI * 2);
        c.lineWidth = Math.max(3, fc.w * 0.014);
        c.strokeStyle = "rgba(20,10,10,.75)";
        c.stroke();
        c.beginPath();
        c.arc(e.x - r * k * 0.35, e.y - r * k * 0.4, r * k * 0.16, 0, Math.PI * 2);
        c.fillStyle = "rgba(255,255,255,.8)";
        c.fill();
      }
    }

    if (id === "mouth") {
      const rx = fc.w * 0.17;
      const k = 1.4 + fc.open * 1.1 + 0.6 * f.beat; // the mouth bounces on the beat
      const m = fc.mouth;
      c.save();
      c.beginPath();
      c.ellipse(m.x, m.y, rx * k, rx * k * 0.8, fc.roll, 0, Math.PI * 2);
      c.clip();
      c.drawImage(base, m.x - rx, m.y - rx, rx * 2, rx * 2, m.x - rx * k, m.y - rx * k, rx * 2 * k, rx * 2 * k);
      c.restore();
      c.beginPath();
      c.ellipse(m.x, m.y, rx * k, rx * k * 0.8, fc.roll, 0, Math.PI * 2);
      c.lineWidth = Math.max(3, fc.w * 0.014);
      c.strokeStyle = "rgba(120,10,30,.8)";
      c.stroke();
      if (fc.open > 0.35) emoji(c, "👅", m.x - u.x * fc.w * 0.02, m.y + fc.w * 0.12, fc.w * (0.22 + fc.open * 0.2), fc.roll);
    }

    if (id === "rainbow" && (fc.open > 0.3 || f.beat > 0.8)) {
      const dir = { x: -u.x, y: -u.y };
      for (let i = 0; i < 4; i++) spawn(f.parts, { x: fc.mouth.x + rnd(-8, 8), y: fc.mouth.y, vx: dir.x * rnd(60, 160) + rnd(-90, 90), vy: dir.y * rnd(120, 260), g: 900, max: rnd(0.9, 1.5), size: rnd(11, 22), color: RAINBOW[(Math.floor(t * 20) + i) % RAINBOW.length]! });
    }

    if (id === "fire" && (fc.open > 0.25 || f.beat > 0.85)) {
      const dir = { x: -u.x, y: -u.y };
      for (let i = 0; i < 2; i++) spawn(f.parts, { x: fc.mouth.x, y: fc.mouth.y, vx: dir.x * rnd(100, 260) + rnd(-110, 110), vy: dir.y * rnd(160, 340), g: -80, max: rnd(0.5, 1), size: rnd(46, 92), ch: "🔥", spin: rnd(-2, 2) });
    }

    // raise your eyebrows and it rains confetti (every effect)
  }

  if (id === "disco") {
    const { W, H } = f;
    if (f.beat > 0.85) confetti(f, Math.random() * W, H * 0.5, 6);
    c.save();
    c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) {
      const g = c.createLinearGradient(0, 0, 0, H * 0.7);
      g.addColorStop(0, `hsla(${(t * 90 + i * 120) % 360},100%,60%,${0.1 + f.beat * 0.22})`);
      g.addColorStop(1, "transparent");
      c.fillStyle = g;
      c.beginPath();
      const x0 = W * (0.15 + i * 0.35);
      c.moveTo(x0, 0);
      c.lineTo(x0 - 60 + Math.sin(t * 2 + i) * 90, H * 0.7);
      c.lineTo(x0 + 60 + Math.sin(t * 2 + i) * 90, H * 0.7);
      c.fill();
    }
    c.restore();
  }

  stepParticles(f, dt);
}
