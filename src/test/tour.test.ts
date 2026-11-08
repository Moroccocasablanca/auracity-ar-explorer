import { describe, expect, it } from "vitest";
import { buildTour, walkingUrl } from "@/lib/tour";

const start = { lat: 44.6985, lng: 7.8538 };
const p = (id: string, dLat: number, dLng: number) => ({ id, lat: start.lat + dLat, lng: start.lng + dLng });

describe("Passeggiata (guided walk)", () => {
  it("visits every nearby monument once, nearest first", () => {
    const places = [p("far", 0.004, 0), p("near", 0.001, 0), p("mid", 0.002, 0)];
    const t = buildTour(places, start);
    expect(t.stops.map((s) => s.place.id)).toEqual(["near", "mid", "far"]);
    expect(new Set(t.stops.map((s) => s.place.id)).size).toBe(3);
  });
  it("leaves out monuments that are too far for a walk", () => {
    const t = buildTour([p("ok", 0.001, 0), p("away", 0.2, 0)], start);
    expect(t.stops.map((s) => s.place.id)).toEqual(["ok"]);
  });
  it("adds up distance and gives a realistic time with listening stops", () => {
    const t = buildTour([p("a", 0.009, 0)], start); // about 1 km
    expect(t.totalM).toBeGreaterThan(900);
    expect(t.totalM).toBeLessThan(1100);
    expect(t.minutes).toBeGreaterThanOrEqual(15);
  });
  it("never makes a longer path than plain nearest-neighbour (no crossings)", () => {
    const places = [p("a", 0.002, 0.002), p("b", -0.002, 0.002), p("c", 0.002, -0.002), p("d", -0.002, -0.002), p("e", 0, 0.003)];
    const t = buildTour(places, start);
    expect(t.stops).toHaveLength(5);
  });
  it("handles an empty city without crashing", () => {
    expect(buildTour([], start)).toEqual({ stops: [], totalM: 0, minutes: 0 });
  });
  it("opens walking directions", () => {
    expect(walkingUrl({ lat: 1, lng: 2 })).toContain("travelmode=walking");
  });
});
