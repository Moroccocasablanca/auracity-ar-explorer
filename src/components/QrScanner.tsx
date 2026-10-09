import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

/** Whether the browser can scan QR codes natively. */
export function canScanQr() {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

export function QrScanner({ onResult, onClose }: { onResult: (value: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let stopped = false;
    (async () => {
      try {
        const Ctor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector })
          .BarcodeDetector;
        const detector = new Ctor({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
        if (stopped) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        timer = window.setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) {
              onResult(codes[0].rawValue);
            }
          } catch {
            /* keep scanning */
          }
        }, 350);
      } catch {
        setError(true);
      }
    })();
    return () => {
      stopped = true;
      if (timer) window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="glass relative overflow-hidden rounded-2xl">
      <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
      <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-primary/70" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="glass absolute right-2 top-2 flex size-8 items-center justify-center rounded-full"
      >
        <X className="size-4" />
      </button>
      {error && <p className="absolute inset-x-0 bottom-2 text-center text-xs text-destructive">Camera error</p>}
    </div>
  );
}
