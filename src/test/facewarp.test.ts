import { describe, expect, it } from "vitest";
import { drawWarp } from "@/components/fun/facewarp";
import { EFFECTS } from "@/components/fun/effects";

function fakeFrame() {
  const calls = { tri: 0 };
  const c = new Proxy({}, { get: (_t, k) => (k === "drawImage" ? () => calls.tri++ : () => {}), set: () => true }) as unknown as CanvasRenderingContext2D;
  const mesh = Array.from({ length: 478 }, (_, i) => ({ x: 200 + 80 * Math.cos(i * 0.7) * ((i % 9) / 9), y: 300 + 100 * Math.sin(i * 0.7) * ((i % 7) / 7) }));
  const face = { nose: mesh[1]!, eyeA: mesh[33]!, eyeB: mesh[263]!, fore: mesh[10]!, chin: mesh[152]!, mouth: mesh[13]!, oval: [], mesh, w: 160, roll: 0.1, open: 0, smile: 0, brow: 0 };
  return { calls, f: { c, base: {} as HTMLCanvasElement, W: 400, H: 600, t: 1, faces: [face], parts: [], beat: 0.5, bp: 3.3, smooth: { x: 200, y: 300, roll: 0, w: 160 }, pose: null } };
}

describe("cambia faccia (face mesh warp)", () => {
  it("the picker shows few effects (5 at most): time warp and tiny head first", () => {
    const ids = EFFECTS.map((e) => e.id);
    expect(ids.length).toBeLessThanOrEqual(5);
    expect(ids.slice(0, 2)).toEqual(["timewarp", "tiny"]);
  });
  for (const id of ["morph", "cartoon", "baby", "alien", "grin", "longface"] as const)
    it(`${id} redraws the face triangle by triangle`, () => {
      const { calls, f } = fakeFrame();
      drawWarp(id, f as never);
      expect(calls.tri).toBeGreaterThan(800);
    });
});
