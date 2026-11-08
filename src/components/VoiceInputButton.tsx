import { useEffect, useRef, useState } from "react";
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { usePromptInputController } from "@/components/ai-elements/prompt-input";
import { useI18n } from "@/lib/i18n";

/** Our own iOS plugin (ios/App/App/LiveSpeech.swift): Apple's speech recognition, words arrive while you talk. */
type LiveSpeechPlugin = {
  start(o: { lang: string }): Promise<void>;
  stop(): Promise<void>;
  addListener(ev: "partial", fn: (d: { text: string; final: boolean }) => void): Promise<PluginListenerHandle>;
  addListener(ev: "end", fn: () => void): Promise<PluginListenerHandle>;
};
const LiveSpeech = registerPlugin<LiveSpeechPlugin>("LiveSpeech");

const LOCALES: Record<string, string> = { it: "it-IT", en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE", ar: "ar-SA", ro: "ro-RO", sq: "sq-AL", hi: "hi-IN" };

type WebRec = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null; start(): void; stop(): void };
const webSpeech = (): (new () => WebRec) | null => {
  const w = typeof window === "undefined" ? undefined : (window as unknown as { SpeechRecognition?: new () => WebRec; webkitSpeechRecognition?: new () => WebRec });
  return w?.SpeechRecognition ?? w?.webkitSpeechRecognition ?? null;
};

/**
 * Dictate a question: tap to start, tap again to stop. The words appear in the message box WHILE you speak
 * (Apple speech on the iPhone app, the browser's own recognition elsewhere); if neither exists the recording is sent to the AI and written when done.
 */
/** The microphone for the chat of the guide (its text box belongs to the prompt component). */
export function VoiceInputButton() {
  const { textInput } = usePromptInputController();
  return <DictateButton value={textInput.value} setValue={textInput.setInput} />;
}

/** The same microphone for ANY text box: the words are written into it while the person speaks. */
export function DictateButton({ value, setValue, className = "" }: { value: string; setValue: (v: string) => void; className?: string }) {
  const { t, lang } = useI18n();
  const [state, setState] = useState<"idle" | "rec" | "busy">("idle");
  const base = useRef("");
  const stopper = useRef<() => void>(() => {});
  const live = useRef({ value, setInput: setValue });
  live.current = { value, setInput: setValue };
  const locale = LOCALES[lang] ?? "it-IT";
  const native = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("LiveSpeech");

  const show = (text: string) => live.current.setInput(`${base.current ? `${base.current} ` : ""}${text}`.trimStart());
  useEffect(() => () => stopper.current(), []);

  const startNative = async () => {
    base.current = live.current.value;
    const handles: PluginListenerHandle[] = [];
    const done = () => { handles.forEach((h) => void h.remove()); setState("idle"); stopper.current = () => {}; };
    handles.push(await LiveSpeech.addListener("partial", (d) => show(d.text)));
    handles.push(await LiveSpeech.addListener("end", done));
    try {
      await LiveSpeech.start({ lang: locale });
      stopper.current = () => void LiveSpeech.stop();
      setState("rec");
    } catch {
      done();
      toast.error(t("guide.mic.denied"));
    }
  };

  const startWeb = (Ctor: new () => WebRec) => {
    base.current = live.current.value;
    const r = new Ctor();
    r.lang = locale;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => show(Array.from(e.results, (x) => x[0]?.transcript ?? "").join(" ").trim());
    r.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") toast.error(t("guide.mic.denied")); };
    r.onend = () => { setState("idle"); stopper.current = () => {}; };
    r.start();
    stopper.current = () => r.stop();
    setState("rec");
  };

  const startRecorded = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m));
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      const limit = setTimeout(() => r.state === "recording" && r.stop(), 90_000); // never record for more than 90 seconds
      r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      r.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        clearTimeout(limit);
        const blob = new Blob(chunks, { type: r.mimeType || mime || "audio/webm" });
        setState("busy");
        try {
          const res = await fetch("/api/transcribe", { method: "POST", headers: { "content-type": blob.type }, body: blob });
          const j = (await res.json()) as { text?: string };
          if (!res.ok) throw new Error("transcribe");
          if (j.text) show(j.text);
          else toast(t("guide.mic.empty"));
        } catch {
          toast.error(t("guide.mic.error"));
        }
        setState("idle");
        stopper.current = () => {};
      };
      base.current = live.current.value;
      r.start();
      stopper.current = () => r.state === "recording" && r.stop();
      setState("rec");
    } catch {
      toast.error(t("guide.mic.denied"));
      setState("idle");
    }
  };

  const start = () => {
    const Web = webSpeech();
    if (native) return void startNative();
    if (Web) return startWeb(Web);
    void startRecorded();
  };
  const canRecord = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
  if (!native && !webSpeech() && !canRecord) return null;

  return (
    <button
      type="button"
      onClick={state === "rec" ? () => stopper.current() : state === "idle" ? start : undefined}
      disabled={state === "busy"}
      aria-label={state === "rec" ? t("guide.mic.stop") : t("guide.mic.start")}
      className={`flex size-10 shrink-0 items-center justify-center rounded-full ${state === "rec" ? "animate-pulse bg-red-500 text-white" : "bg-primary/15 text-primary active:bg-primary/25"} ${className}`}
    >
      {state === "busy" ? <Loader2 className="size-5 animate-spin" /> : state === "rec" ? <Square className="size-5" /> : <Mic className="size-5" />}
    </button>
  );
}
