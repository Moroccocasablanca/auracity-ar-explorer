import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { distanceM, type LatLng } from "./geo";
import { batterySaverPreference, POWER_EVENT } from "./power";

export const BRA_CENTER: LatLng = { lat: 44.6985, lng: 7.8538 };
const MAX_DIST_FROM_BRA_M = 8000;

/** Smooths the jumpy GPS dot: a precise fix moves the position a lot, a poor one only a little (a light Kalman filter). */
type GpsFilter = { lat: number; lng: number; variance: number; at: number };
function smoothFix(prev: GpsFilter | null, fix: LatLng, accuracy: number, now: number): { pos: LatLng; accuracy: number; state: GpsFilter } {
  const acc = Math.max(3, accuracy);
  if (!prev || now - prev.at > 30_000) {
    const state = { lat: fix.lat, lng: fix.lng, variance: acc * acc, at: now };
    return { pos: fix, accuracy: acc, state };
  }
  // the position drifts a little between fixes (walking ≈ 1.5 m/s)
  const variance = prev.variance + ((now - prev.at) / 1000) * 2.5;
  const k = variance / (variance + acc * acc);
  const state = { lat: prev.lat + k * (fix.lat - prev.lat), lng: prev.lng + k * (fix.lng - prev.lng), variance: (1 - k) * variance, at: now };
  return { pos: { lat: state.lat, lng: state.lng }, accuracy: Math.sqrt(state.variance), state };
}

export type LocationState = {
  pos: LatLng | null;
  accuracy: number;
  heading: number;
  /** ground speed in m/s from GPS, null when unknown */
  speed: number | null;
  /** true when the position is simulated (no GPS or user far from Bra) */
  demo: boolean;
  demoReason: "nogps" | "outside" | "manual" | null;
  active: boolean;
  start: (opts?: { demo?: boolean }) => Promise<void>;
  /** Test tool: pretend to stand at a given point (owner testing without walking). */
  simulate: (p: LatLng) => void;
  stop: () => void;
  setHeading: (h: number) => void;
};

const Ctx = createContext<LocationState | null>(null);

type OrientationEvt = DeviceOrientationEvent & { webkitCompassHeading?: number };

export function LocationProvider({ children }: { children: ReactNode }) {
  const [pos, setPos] = useState<LatLng | null>(null);
  const [accuracy, setAccuracy] = useState(9999);
  const [heading, setHeadingState] = useState(0);
  const [speed, setSpeed] = useState<number | null>(null);
  const [demo, setDemo] = useState(false);
  const [demoReason, setDemoReason] = useState<LocationState["demoReason"]>(null);
  const [active, setActive] = useState(false);
  const watchId = useRef<number | null>(null);
  const orientationOn = useRef(false);
  const hasCompass = useRef(false);
  const lastUpdate = useRef(0);
  const lastHeading = useRef(0);
  const lastHeadingAt = useRef(0);
  const accuracyRef = useRef(9999);
  const filter = useRef<GpsFilter | null>(null);
  const goodAt = useRef(0);
  const [batterySaver, setBatterySaver] = useState(true);

  useEffect(() => {
    const sync = () => setBatterySaver(batterySaverPreference());
    sync(); window.addEventListener(POWER_EVENT, sync);
    return () => window.removeEventListener(POWER_EVENT, sync);
  }, []);

  const onOrientation = useCallback((e: Event) => {
    const ev = e as OrientationEvt;
    let h: number | null = null;
    if (typeof ev.webkitCompassHeading === "number") h = ev.webkitCompassHeading;
    else if (ev.alpha != null && (ev.absolute || e.type === "deviceorientationabsolute")) h = (360 - ev.alpha) % 360;
    if (h != null && !Number.isNaN(h)) {
      hasCompass.current = true;
      // The compass fires ~60 times a second: smooth it and update at most ~8 times a second, or the whole AR screen stutters.
      const now = performance.now();
      if (now - lastHeadingAt.current < 120) return;
      const delta = ((h - lastHeading.current + 540) % 360) - 180;
      if (Math.abs(delta) < 2) return;
      lastHeadingAt.current = now;
      lastHeading.current = (lastHeading.current + delta * 0.5 + 360) % 360;
      setHeadingState(lastHeading.current);
    }
  }, []);

  const goDemo = useCallback((reason: "nogps" | "outside" | "manual") => {
    if (watchId.current != null) {
      navigator.geolocation?.clearWatch(watchId.current);
      watchId.current = null;
    }
    setDemo(true);
    setDemoReason(reason);
    setPos(BRA_CENTER);
    setAccuracy(5);
  }, []);

  const start = useCallback(
    async (opts?: { demo?: boolean }) => {
      setActive(true);
      // Compass (iOS needs an explicit permission request from a user gesture)
      try {
        const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } })
          .DeviceOrientationEvent;
        if (DOE?.requestPermission) await DOE.requestPermission();
      } catch {
        /* ignore */
      }
      if (!orientationOn.current) {
        window.addEventListener("deviceorientationabsolute", onOrientation, true);
        window.addEventListener("deviceorientation", onOrientation, true);
        orientationOn.current = true;
      }

      if (opts?.demo) {
        goDemo("manual");
        return;
      }
      if (!("geolocation" in navigator)) {
        goDemo("nogps");
        return;
      }
      setDemo(false);
      setDemoReason(null);
      watchId.current = navigator.geolocation.watchPosition(
        (p) => {
          const now = Date.now();
          if (now - lastUpdate.current < (batterySaver ? 3_000 : 1_000)) return;
          lastUpdate.current = now;
          const here = { lat: p.coords.latitude, lng: p.coords.longitude };
          if (distanceM(here, BRA_CENTER) > MAX_DIST_FROM_BRA_M) {
            goDemo("outside");
            return;
          }
          setDemo(false);
          setDemoReason(null);
          // A very imprecise fix must not throw away a good one: keep the better position until it is clearly outdated.
          if (p.coords.accuracy > 60 && accuracyRef.current <= 30 && now - goodAt.current < 20_000) return;
          if (p.coords.accuracy <= 30) goodAt.current = now;
          accuracyRef.current = p.coords.accuracy;
          const smooth = smoothFix(filter.current, here, p.coords.accuracy, now);
          filter.current = smooth.state;
          setPos(smooth.pos);
          setAccuracy(smooth.accuracy);
          setSpeed(p.coords.speed);
        },
        () => goDemo("nogps"),
        // AR needs a precise position: always ask the GPS chip (battery saving only slows how often we update).
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
      );
    },
    [goDemo, onOrientation, batterySaver],
  );

  const simulate = useCallback((p: LatLng) => {
    if (watchId.current != null) {
      navigator.geolocation?.clearWatch(watchId.current);
      watchId.current = null;
    }
    setActive(true);
    // Counts as a real position so presence rules (reviews, messages, stamps) can be tested from the sofa.
    setDemo(false);
    setDemoReason(null);
    setPos(p);
    setAccuracy(5);
    setSpeed(null);
  }, []);

  const stop = useCallback(() => {
    if (watchId.current != null) navigator.geolocation?.clearWatch(watchId.current);
    watchId.current = null;
    if (orientationOn.current) {
      window.removeEventListener("deviceorientationabsolute", onOrientation, true);
      window.removeEventListener("deviceorientation", onOrientation, true);
      orientationOn.current = false;
    }
    setActive(false);
    setDemo(false);
    setDemoReason(null);
    setPos(null);
    setSpeed(null);
    filter.current = null;
  }, [onOrientation]);

  useEffect(() => () => stop(), [stop]);

  const setHeading = useCallback((h: number) => setHeadingState(((h % 360) + 360) % 360), []);

  const value = useMemo<LocationState>(
    () => ({ pos, accuracy, heading, speed, demo, demoReason, active, start, stop, setHeading, simulate }),
    [pos, accuracy, heading, speed, demo, demoReason, active, start, stop, setHeading, simulate],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocation() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLocation outside provider");
  return c;
}
