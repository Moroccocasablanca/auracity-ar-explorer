// Two classics that make people laugh on TikTok, done properly:
// - "Time Warp": a glowing line slides down the screen and FREEZES everything it leaves behind. Move while it passes and you get a stretched,
//   twisted, impossible face. The line then waits a moment so the photo/video can be taken, and starts again.
// - "Faccina": your real head, tiny, on your normal body, wobbling to the music.
import type { Frame } from "@/components/fun/effects";

const SWEEP = 6.5; // seconds for the line to cross the screen
const HOLD = 2.8; // seconds the finished picture stays before starting again
let frozen: HTMLCanvasElement | null = null;
let startAt = -1;
let lastY = 0;
let lastT = 0;

export function drawTimeWarp(f: Frame) {
  const { c, base, W, H, t } = f;
  if (!frozen || frozen.width !== W || frozen.height !== H) {
    frozen = Object.assign(document.createElement("canvas"), { width: W, height: H });
    startAt = -1;
  }
  if (startAt < 0 || t - lastT > 1 || t - startAt > SWEEP + HOLD) { startAt = t; lastY = 0; } // (re)start, also when coming back to this effect
  lastT = t;
  const fz = frozen.getContext("2d")!;
  const k = Math.min(1, (t - startAt) / SWEEP);
  const y = Math.round(k * H);
  if (y > lastY) { fz.drawImage(base, 0, lastY, W, y - lastY, 0, lastY, W, y - lastY); lastY = y; }

  c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  c.drawImage(base, 0, 0);
  if (y > 0) c.drawImage(frozen, 0, 0, W, y, 0, 0, W, y);
  if (k < 1) {
    // the scanning line: bright cyan core with a soft glow
    const g = c.createLinearGradient(0, y - 26, 0, y + 6);
    g.addColorStop(0, "rgba(0,229,255,0)");
    g.addColorStop(0.8, "rgba(0,229,255,0.45)");
    g.addColorStop(1, "rgba(180,250,255,1)");
    c.fillStyle = g;
    c.fillRect(0, y - 26, W, 32);
    c.fillStyle = "#e6fdff";
    c.fillRect(0, y - 1.5, W, 3);
  }
}

/** Tiny head: the real head is cut out (drawHead) and drawn small; the gap is hidden with the skin colour (plug). */
export function tinyHead(f: Frame, fc: Frame["faces"][number], plug: (f: Frame, fc: Frame["faces"][number]) => void, drawHead: (f: Frame, fc: Frame["faces"][number], o: { dx?: number; dy?: number; rot?: number; s?: number }) => void) {
  plug(f, fc);
  const sw = Math.sin(f.bp * Math.PI);
  drawHead(f, fc, { s: 0.42 + 0.05 * f.beat, rot: sw * 0.18, dx: sw * fc.w * 0.05, dy: -Math.abs(sw) * fc.w * 0.04 });
}
