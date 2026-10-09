import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { distanceM, type LatLng } from "./geo";

export const BRA_CENTER: LatLng = { lat: 44.6985, lng: 7.8538 };
const MAX_DIST_FROM_BRA_M = 8000;

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

  const onOrientation = useCallback((e: Event) => {
    const ev = e as OrientationEvt;
    let h: number | null = null;
    if (typeof ev.webkitCompassHeading === "number") h = ev.webkitCompassHeading;
    else if (ev.alpha != null && (ev.absolute || e.type === "deviceorientationabsolute")) h = (360 - ev.alpha) % 360;
    if (h != null && !Number.isNaN(h)) {
      hasCompass.current = true;
      setHeadingState(h);
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
          const here = { lat: p.coords.latitude, lng: p.coords.longitude };
          if (distanceM(here, BRA_CENTER) > MAX_DIST_FROM_BRA_M) {
            goDemo("outside");
            return;
          }
          setDemo(false);
          setDemoReason(null);
          setPos(here);
          setAccuracy(p.coords.accuracy);
          setSpeed(p.coords.speed);
        },
        () => goDemo("nogps"),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 12000 },
      );
    },
    [goDemo, onOrientation],
  );

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
  }, [onOrientation]);

  useEffect(() => () => stop(), [stop]);

  const setHeading = useCallback((h: number) => setHeadingState(((h % 360) + 360) % 360), []);

  const value = useMemo<LocationState>(
    () => ({ pos, accuracy, heading, speed, demo, demoReason, active, start, stop, setHeading }),
    [pos, accuracy, heading, speed, demo, demoReason, active, start, stop, setHeading],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocation() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLocation outside provider");
  return c;
}
