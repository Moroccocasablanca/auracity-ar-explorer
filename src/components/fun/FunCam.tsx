// "Effetti": the funny camera. The face is found on the phone (MediaPipe, free, no picture ever leaves the phone) and the effects follow it.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { toast } from "sonner";
import { ScanLine, Minimize2, Baby, Drama, Laugh, Orbit, Ruler, Wand2, AlertTriangle, ArrowLeft, Camera, Clapperboard, Download, FlipHorizontal2, Frame as FrameIcon, ScanFace, Film, Grid2x2, RefreshCw, Share2, Smile, Sparkles, Tv, UserRound, Video, Volume2, VolumeX, X, Zap, type LucideIcon } from "lucide-react";
import { FaceLandmarker, FilesetResolver, PoseLandmarker, type FaceLandmarkerResult, type PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import { engineFileset, faceModelUrl, PLAIN_FACE, PLAIN_POSE, plainFileset, poseModelUrl } from "@/components/fun/engine";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { drawBase, drawOverlay, EFFECTS, type EffectId, type Face, type Frame, type Particle, type Pose } from "@/components/fun/effects";

const FX_ICON: Partial<Record<EffectId, LucideIcon>> = { scan: ScanFace, paint: FrameIcon, sym: FlipHorizontal2, noir: Clapperboard, neon: Zap, vhs: Tv, pop: Grid2x2, dream: Sparkles, cinema: Film, bulge: Smile, bighead: UserRound, morph: Wand2, cartoon: Drama, baby: Baby, alien: Orbit, grin: Laugh, longface: Ruler, timewarp: ScanLine, tiny: Minimize2 };
// a strong colour for every bubble of the picker
const FX_TINT: Partial<Record<EffectId, string>> = { timewarp: "from-cyan-300 via-sky-500 to-blue-700", tiny: "from-yellow-300 to-orange-500", morph: "from-fuchsia-500 via-violet-500 to-cyan-400", cartoon: "from-amber-400 to-pink-500", baby: "from-pink-300 to-sky-300", alien: "from-lime-400 to-emerald-600", grin: "from-yellow-300 to-orange-500", longface: "from-sky-400 to-indigo-600", scan: "from-cyan-400 to-blue-600", sym: "from-violet-400 to-purple-700", bulge: "from-rose-400 to-red-600", bighead: "from-teal-300 to-cyan-600" };
const FACE_FX = new Set<EffectId>([]);
const FAST_MPS = 2.5; // above brisk walking: pause for safety (same rule as the AR view)
const BPM = 118;
// the 36 points that draw the outline of a face in the MediaPipe model
const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

type Landmark = { x: number; y: number };
const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const score = (r: FaceLandmarkerResult, i: number, name: string) => r.faceBlendshapes?.[i]?.categories.find((c) => c.categoryName === name)?.score ?? 0;

/** A tiny dance beat made with the phone's own audio (no file): kick on every beat, hat in between, a bass note. */
function makeBeat() {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  const rec = ctx.createMediaStreamDestination();
  master.connect(rec);
  const spb = 60 / BPM;
  const start = ctx.currentTime + 0.1;
  let next = 0;
  const noise = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
  noise.getChannelData(0).forEach((_, i, a) => (a[i] = (Math.random() * 2 - 1) * (1 - i / a.length)));
  const kick = (t: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.35);
  };
  const hat = (t: number) => {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const g = ctx.createGain();
    g.gain.value = 0.22;
    s.connect(g).connect(master);
    s.start(t);
  };
  const bass = (t: number, f: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + spb * 0.45);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + spb * 0.5);
  };
  const notes = [55, 55, 82.4, 65.4];
  // a catchy little tune on top (pentatonic, so it always sounds good)
  const tune = [440, 0, 523.25, 587.33, 659.25, 0, 587.33, 523.25, 440, 0, 392, 440, 523.25, 587.33, 523.25, 0];
  const lead = (t: number, f: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + spb * 0.42);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + spb * 0.45);
  };
  const timer = window.setInterval(() => {
    while (start + next * (spb / 2) < ctx.currentTime + 0.25) {
      const t = start + next * (spb / 2);
      if (next % 2 === 0) { kick(t); bass(t, notes[(next / 2) % 4]!); } else hat(t);
      const lf = tune[next % tune.length]!;
      if (lf) lead(t, lf);
      next++;
    }
  }, 40);
  return {
    pulse: () => {
      const ph = (((ctx.currentTime - start) / spb) % 1 + 1) % 1;
      return Math.exp(-ph * 5.5);
    },
    /** where we are in the music, in beats */
    position: () => Math.max(0, (ctx.currentTime - start) / spb),
    stream: rec.stream,
    resume: () => void ctx.resume(),
    stop: () => { window.clearInterval(timer); void ctx.close(); },
  };
}

export default function FunCam() {
  const { t } = useI18n();
  const loc = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const filesetRef = useRef<Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | null>(null);
  const poseSmooth = useRef<Pose | null>(null);
  const beatRef = useRef<ReturnType<typeof makeBeat> | null>(null);
  const partsRef = useRef<Particle[]>([]);
  const effectRef = useRef<EffectId>("dance");
  const facingRef = useRef<"user" | "environment">("user");
  const recRef = useRef<MediaRecorder | null>(null);
  const smoothRef = useRef({ x: 0, y: 0, roll: 0, w: 200 });
  const lastFaceAt = useRef(0);
  const lastBodyAt = useRef(0);
  const poseLoading = useRef(false);

  const [consented, setConsented] = useState(false);
  const [effect, setEffect] = useState<EffectId>("timewarp");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [seesFace, setSeesFace] = useState(true);
  const [seesBody, setSeesBody] = useState(true);
  const [shot, setShot] = useState<{ url: string; blob: Blob; video: boolean } | null>(null);
  const [recording, setRecording] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [modelReady, setModelReady] = useState(false);

  const tooFast = !loc.demo && loc.speed != null && loc.speed > FAST_MPS;
  effectRef.current = effect;
  facingRef.current = facing;

  // the music belongs to the dance effects only
  useEffect(() => {
    if (EFFECTS.find((e) => e.id === effect)?.music && consented && soundOn) {
      if (!beatRef.current) beatRef.current = makeBeat();
      beatRef.current.resume();
    } else if (beatRef.current) {
      beatRef.current.stop();
      beatRef.current = null;
    }
  }, [effect, consented, soundOn]);

  useEffect(() => {
    if (!consented || tooFast) return;
    let stop = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    setStatus("loading");

    (async () => {
      try {
        // the models start downloading at once, WHILE the phone asks for the camera and starts it: nobody waits for the two things one after the other
        const loadModels = (async () => {
          if (landmarkerRef.current) return;
          const opts = { runningMode: "VIDEO" as const, numFaces: 2, outputFaceBlendshapes: true };
          const make = async (fs: Awaited<ReturnType<typeof plainFileset>>, model: string) => {
            try { return await FaceLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: model, delegate: "GPU" }, ...opts }); }
            catch { return await FaceLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: model, delegate: "CPU" }, ...opts }); }
          };
          try {
            const fs = await engineFileset(); // from the phone's storage when it is there
            filesetRef.current = fs;
            landmarkerRef.current = await make(fs, await faceModelUrl());
          } catch {
            const fs = await plainFileset(); // fall back to the server
            filesetRef.current = fs;
            landmarkerRef.current = await make(fs, PLAIN_FACE);
          }
        })().then(() => { if (!stop) setModelReady(true); }).catch(() => { /* the effects that do not need a face still work */ });
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: facing, width: { ideal: 960 }, height: { ideal: 1280 } } });
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        if (landmarkerRef.current) setModelReady(true);
        void loadModels;
        if (stop) return;
        setStatus("ready");

        const canvas = canvasRef.current!;
        const c = canvas.getContext("2d")!;
        const base = (baseRef.current ??= document.createElement("canvas"));
        const bc = base.getContext("2d")!;
        let lastT = performance.now();
        let lastVideoTime = -1;
        let result: FaceLandmarkerResult | null = null;
        let frames = 0;
        let poseResult: PoseLandmarkerResult | null = null;
        let lastPoseTime = -1;

        const loop = (now: number) => {
          raf = requestAnimationFrame(loop);
          const dt = Math.min(0.05, (now - lastT) / 1000);
          lastT = now;
          if (video.readyState < 2 || !video.videoWidth) return;
          const W = canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 1.5);
          const H = canvas.clientHeight * Math.min(window.devicePixelRatio || 1, 1.5);
          if (canvas.width !== Math.round(W) || canvas.height !== Math.round(H)) { canvas.width = base.width = Math.round(W); canvas.height = base.height = Math.round(H); }
          const cw = canvas.width;
          const ch = canvas.height;
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const s = Math.max(cw / vw, ch / vh);
          const ox = (cw - vw * s) / 2;
          const oy = (ch - vh * s) / 2;
          const mirror = facingRef.current === "user";

          // the camera picture, filling the screen (and mirrored for the front camera, like a mirror)
          bc.save();
          if (mirror) { bc.translate(cw, 0); bc.scale(-1, 1); }
          bc.drawImage(video, ox, oy, vw * s, vh * s);
          bc.restore();

          // find the faces (about 20 times a second is plenty and keeps the phone cool)
          frames++;
          if (landmarkerRef.current && video.currentTime !== lastVideoTime && frames % 2 === 0) {
            lastVideoTime = video.currentTime;
            try { result = landmarkerRef.current.detectForVideo(video, now); } catch { /* skip this frame */ }
          }
          // the body (only for the hips dance, and only when it is chosen: the body model is loaded the first time)
          let pose: Pose | null = null;
          if (effectRef.current === "hips") {
            if (!poseRef.current && !poseLoading.current && filesetRef.current) {
              poseLoading.current = true;
              const o = { runningMode: "VIDEO" as const, numPoses: 1 };
              poseModelUrl()
                .then((m) => PoseLandmarker.createFromOptions(filesetRef.current!, { baseOptions: { modelAssetPath: m, delegate: "GPU" }, ...o }).catch(() => PoseLandmarker.createFromOptions(filesetRef.current!, { baseOptions: { modelAssetPath: m, delegate: "CPU" }, ...o })))
                .catch(() => PoseLandmarker.createFromOptions(filesetRef.current!, { baseOptions: { modelAssetPath: PLAIN_POSE, delegate: "CPU" }, ...o }))
                .then((l) => { poseRef.current = l; })
                .catch(() => { /* no body model: the face guess is used */ })
                .finally(() => { poseLoading.current = false; });
            }
            if (poseRef.current && frames % 2 === 1 && video.currentTime !== lastPoseTime) {
              lastPoseTime = video.currentTime;
              try { poseResult = poseRef.current.detectForVideo(video, now); } catch { /* skip this frame */ }
            }
          }
          const mapP = (p: Landmark) => ({ x: ox + (mirror ? 1 - p.x : p.x) * vw * s, y: oy + p.y * vh * s });
          const lmP = poseResult?.landmarks?.[0];
          if (effectRef.current === "hips" && lmP && lmP[23] && lmP[24] && lmP[11] && lmP[12] && (lmP[23].visibility ?? 1) > 0.3) {
            const raw: Pose = { shL: mapP(lmP[11]), shR: mapP(lmP[12]), hipL: mapP(lmP[23]), hipR: mapP(lmP[24]) };
            const prev = poseSmooth.current;
            const k = 0.3; // smooth, so the picture does not tremble
            poseSmooth.current = prev ? { shL: lerp(prev.shL, raw.shL, k), shR: lerp(prev.shR, raw.shR, k), hipL: lerp(prev.hipL, raw.hipL, k), hipR: lerp(prev.hipR, raw.hipR, k) } : raw;
            pose = poseSmooth.current;
            lastBodyAt.current = now;
            setSeesBody((v) => (v ? v : true));
          } else if (effectRef.current === "hips" && now - lastBodyAt.current > 1800) setSeesBody((v) => (v ? false : v));
          const map = (p: Landmark) => ({ x: ox + (mirror ? 1 - p.x : p.x) * vw * s, y: oy + p.y * vh * s });
          const faces: Face[] = [];
          (result?.faceLandmarks ?? []).forEach((lm, i) => {
            const P = (k: number) => map(lm[k]!);
            const eyeA = map({ x: (lm[33]!.x + lm[133]!.x) / 2, y: (lm[33]!.y + lm[133]!.y) / 2 });
            const eyeB = map({ x: (lm[362]!.x + lm[263]!.x) / 2, y: (lm[362]!.y + lm[263]!.y) / 2 });
            const l = P(234);
            const r = P(454);
            const w = Math.hypot(r.x - l.x, r.y - l.y);
            const left = eyeA.x < eyeB.x ? eyeA : eyeB;
            const right = eyeA.x < eyeB.x ? eyeB : eyeA;
            faces.push({
              oval: OVAL.map((k) => P(k)),
              mesh: lm.map((q) => map(q)),
              nose: P(1), eyeA: left, eyeB: right, fore: P(10), chin: P(152),
              mouth: { x: (P(13).x + P(14).x) / 2, y: (P(13).y + P(14).y) / 2 },
              w, roll: Math.atan2(right.y - left.y, right.x - left.x),
              open: Math.min(1, score(result!, i, "jawOpen") * 1.6),
              smile: Math.min(1, (score(result!, i, "mouthSmileLeft") + score(result!, i, "mouthSmileRight")) * 0.9),
              brow: score(result!, i, "browInnerUp"),
            });
          });
          if (faces[0]) {
            const f0 = faces[0];
            const sm = smoothRef.current;
            const k = sm.w === 200 && sm.x === 0 ? 1 : 0.18; // follows the face smoothly, no jitter
            sm.x += (f0.nose.x - sm.x) * k;
            sm.y += (f0.nose.y - sm.y) * k;
            sm.w += (f0.w - sm.w) * k;
            sm.roll += (f0.roll - sm.roll) * k;
          }
          if (faces.length) { lastFaceAt.current = now; setSeesFace((v) => (v ? v : true)); }
          else if (now - lastFaceAt.current > 1500) setSeesFace((v) => (v ? false : v));

          const id = effectRef.current;
          const musical = EFFECTS.find((e) => e.id === id)?.music;
          const bp = beatRef.current ? beatRef.current.position() : (now / 1000) * (BPM / 60);
          const beat = beatRef.current ? beatRef.current.pulse() : musical ? Math.exp(-((bp % 1) * 5.5)) : 0;
          const frame: Frame = { c, base, W: cw, H: ch, t: now / 1000, faces: result ? faces : [], parts: partsRef.current, beat, bp, smooth: smoothRef.current, pose };
          // an effect that fails on one frame must never freeze the picture: show the plain camera for that frame instead
          try { drawBase(id, frame); drawOverlay(id, frame, dt); }
          catch { try { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = "source-over"; c.filter = "none"; c.drawImage(base, 0, 0); } catch { /* nothing more to do */ } }
        };
        raf = requestAnimationFrame(loop);
      } catch {
        if (!stop) setStatus("error");
      }
    })();

    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [consented, facing, tooFast]);

  useEffect(
    () => () => {
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      poseRef.current?.close();
      poseRef.current = null;
      beatRef.current?.stop();
      beatRef.current = null;
    },
    [],
  );

  const photo = useCallback(() => {
    canvasRef.current?.toBlob((b) => b && setShot({ url: URL.createObjectURL(b), blob: b, video: false }), "image/jpeg", 0.92);
  }, []);

  const toggleVideo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (recRef.current && recRef.current.state === "recording") { recRef.current.stop(); return; }
    const out = canvas.captureStream(30);
    beatRef.current?.stream.getAudioTracks().forEach((tr) => out.addTrack(tr)); // the music of the disco goes into the video too
    const mime = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(out, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      setRecording(false);
      const blob = new Blob(chunks, { type: rec.mimeType || "video/mp4" });
      setShot({ url: URL.createObjectURL(blob), blob, video: true });
    };
    rec.start();
    recRef.current = rec;
    setRecording(true);
    window.setTimeout(() => rec.state === "recording" && rec.stop(), 20_000); // short clips, like the real thing
  }, []);

  // Saving: on the iPhone app the browser's "download" does not exist, so the file is written on the phone and the iPhone's own share sheet is opened
  // (it has "Salva video" / "Salva immagine" to put it in Photos, and WhatsApp, Instagram, TikTok...). In a browser the normal share / download is used.
  const share = async () => {
    if (!shot) return;
    const ext = shot.video ? (shot.blob.type.includes("mp4") ? "mp4" : "webm") : "jpg";
    const name = `auracity-effetto-${Date.now()}.${ext}`;
    try {
      if (Capacitor.isNativePlatform()) {
        const data = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result).split(",")[1] ?? "");
          fr.onerror = () => reject(fr.error);
          fr.readAsDataURL(shot.blob);
        });
        const written = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache });
        await Share.share({ title: "AURACITY", files: [written.uri] });
        return;
      }
      const file = new File([shot.blob], name, { type: shot.blob.type });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "AURACITY" }); return; }
      throw new Error("no share");
    } catch (e) {
      if ((e as Error)?.name === "AbortError" || /cancel/i.test(String((e as Error)?.message))) return; // the person closed the sheet
      const a = document.createElement("a");
      a.href = shot.url;
      a.download = name;
      a.click();
      toast.error(t("fun.savefail"));
    }
  };

  const needsFace = EFFECTS.find((e) => e.id === effect)?.needsFace;

  return (
    <div className="fixed inset-0 z-[3000] bg-black text-white" onPointerDown={() => beatRef.current?.resume()}>
      <video ref={videoRef} playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />

      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link to="/explore" aria-label={t("fun.back")} className="flex size-11 items-center justify-center rounded-full bg-black/45 backdrop-blur"><ArrowLeft className="size-5" /></Link>
        <p className="rounded-full bg-black/45 px-3 py-1.5 text-sm font-bold backdrop-blur">{t("fun.title")}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setSoundOn((v) => !v)} aria-pressed={soundOn} aria-label={t("fun.mute")} className={`flex size-11 items-center justify-center rounded-full backdrop-blur ${soundOn ? "bg-black/45" : "bg-red-600/80"}`}>{soundOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}</button>
        <button type="button" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} aria-label={t("fun.flip")} className="flex size-11 items-center justify-center rounded-full bg-black/45 backdrop-blur"><RefreshCw className="size-5" /></button>
        </div>
      </div>

      {consented && !tooFast && status === "ready" && effect === "hips" && !seesBody && (
        <p className="pointer-events-none absolute inset-x-6 top-1/3 z-10 mx-auto w-fit rounded-2xl bg-black/60 px-4 py-2 text-center text-sm font-semibold backdrop-blur">{t("fun.nobody")}</p>
      )}
      {consented && !tooFast && status === "ready" && needsFace && !seesFace && (
        <p className="pointer-events-none absolute inset-x-0 top-1/3 z-10 mx-auto w-fit rounded-full bg-black/55 px-4 py-2 text-sm font-semibold backdrop-blur">{t("fun.noface")}</p>
      )}
      {status === "ready" && consented && !tooFast && !modelReady && needsFace && <p className="pointer-events-none absolute inset-x-0 top-24 z-10 mx-auto w-fit rounded-full bg-black/55 px-4 py-2 text-sm font-semibold backdrop-blur">{t("fun.loading")}</p>}
      {status === "loading" && consented && !tooFast && <p className="absolute inset-x-0 top-1/2 z-10 text-center text-sm font-semibold">{t("fun.loading")}</p>}
      {status === "error" && <p className="absolute inset-x-6 top-1/2 z-10 rounded-2xl bg-black/70 p-4 text-center text-sm">{t("fun.error")}</p>}

      {consented && !tooFast && (
        <div className="absolute inset-x-0 bottom-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
          <p key={effect} className="fx-name pointer-events-none mb-2 text-center text-lg font-black tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{t(`fx.${effect}`)}{effect === "timewarp" && <span className="mt-0.5 block text-xs font-semibold text-white/80">{t("fx.timewarp.tip")}</span>}</p>
          <div className="no-scrollbar flex snap-x snap-mandatory items-end gap-3 overflow-x-auto px-[calc(50%-1.75rem)] pb-4">
            {EFFECTS.map((e, n) => {
              const Ic = FX_ICON[e.id];
              const on = effect === e.id;
              const group = FACE_FX.size && n === 0 ? "face" : null;
              return (
                <div key={e.id} className="flex shrink-0 snap-center flex-col items-center">
                  <span className="mb-1 h-3 text-[0.55rem] font-bold uppercase tracking-widest text-white/60">{group ? t(`fx.group.${group}`) : ""}</span>
                  <button type="button" onClick={() => { setEffect(e.id); navigator.vibrate?.(8); }} aria-pressed={on} aria-label={t(`fx.${e.id}`)}
                    className={`relative flex items-center justify-center rounded-full bg-gradient-to-br ${FX_TINT[e.id] ?? "from-slate-500 to-slate-700"} shadow-lg transition-all duration-300 ease-out active:scale-90 ${on ? "size-16 ring-4 ring-white shadow-[0_0_24px_rgba(255,255,255,0.55)]" : "size-12 opacity-80 ring-2 ring-white/25"}`}>
                    {Ic ? <Ic className={on ? "size-8" : "size-6"} strokeWidth={1.8} /> : <span className="text-2xl leading-none">{e.emoji}</span>}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-8">
            <button type="button" onClick={toggleVideo} aria-label={t(recording ? "fun.stop" : "fun.video")} className={`flex size-12 items-center justify-center rounded-full backdrop-blur ${recording ? "animate-pulse bg-red-600" : "bg-black/45"}`}><Video className="size-6" /></button>
            <button type="button" onClick={photo} aria-label={t("fun.photo")} className="flex size-[4.5rem] items-center justify-center rounded-full border-4 border-white bg-white/25 active:scale-90"><Camera className="size-8" /></button>
            <span className="size-12" />
          </div>
        </div>
      )}

      {!consented && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-6">
          <div className="max-w-sm rounded-3xl bg-card p-5 text-card-foreground">
            <p className="flex items-start gap-2 text-sm leading-snug"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-kind-business" />{t("safety.cam.one")}</p>
            <p className="mt-3 text-xs text-muted-foreground">{t("fun.privacy")}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConsented(true)} className="flex-1 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">{t("safety.cam.ok")}</button>
              <Link to="/explore" className="rounded-full border border-border px-4 py-3 text-sm font-semibold">{t("safety.cam.cancel")}</Link>
            </div>
          </div>
        </div>
      )}

      {tooFast && <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 p-8 text-center text-base font-medium">{t("safety.paused")}</div>}

      {shot && (
        <div className="absolute inset-0 z-30 flex flex-col bg-black/95">
          <button type="button" onClick={() => { URL.revokeObjectURL(shot.url); setShot(null); }} aria-label={t("fun.close")} className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex size-11 items-center justify-center rounded-full bg-black/60"><X className="size-5" /></button>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            {shot.video ? <video src={shot.url} controls autoPlay loop playsInline className="max-h-full max-w-full rounded-2xl" /> : <img src={shot.url} alt="" className="max-h-full max-w-full rounded-2xl" />}
          </div>
          <div className="flex justify-center gap-3 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => void share()} className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"><Share2 className="size-4" />{t("fun.share")}</button>
            <button type="button" onClick={() => void share()} className="flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-bold"><Download className="size-4" />{t("fun.save")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
