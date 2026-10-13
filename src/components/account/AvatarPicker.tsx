import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { AVATARS, RINGS, photoToAvatar, setAvatar, setRing, useAvatar, useRing } from "@/lib/avatar";
import { useI18n } from "@/lib/i18n";
import { getNick, setNick } from "@/lib/leaderboard";

/** "Who are you on the map": a name, an emoji avatar or your own photo. */
export function AvatarPicker() {
  const { t } = useI18n();
  const av = useAvatar();
  const ring = useRing();
  const file = useRef<HTMLInputElement>(null);
  const [nick, setNickState] = useState(() => (typeof localStorage === "undefined" ? "" : getNick()));
  const [err, setErr] = useState(false);
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-4">
      <p className="text-sm font-semibold">{t("avatar.title")}</p>
      <div className="flex items-center gap-3">
        <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-cyan-400 to-indigo-500 text-3xl shadow">
          {av.kind === "photo" ? <img src={av.value} alt="" className="size-full object-cover" /> : av.kind === "emoji" ? av.value : <span className="text-2xl">👤</span>}
        </span>
        <input
          value={nick}
          maxLength={18}
          onChange={(e) => { setNickState(e.target.value); setNick(e.target.value); }}
          placeholder={t("greet.name.ph")}
          className="min-w-0 flex-1 rounded-xl border border-input bg-secondary/70 px-3 py-2.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {AVATARS.map((src) => (
          <button key={src} type="button" onClick={() => setAvatar({ kind: "photo", value: src })} className={`aspect-square overflow-hidden rounded-full border-4 ${av.kind === "photo" && av.value === src ? "border-primary" : "border-transparent"}`} aria-label="avatar">
            <img src={src} alt="" className="size-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t("avatar.ring")}</p>
        <div className="flex gap-2">
          {RINGS.map((c) => (
            <button key={c} type="button" onClick={() => setRing(c)} aria-label={c} className={`size-8 rounded-full border-2 ${ring === c ? "border-white ring-2 ring-primary" : "border-transparent"}`} style={{ background: c }} />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => file.current?.click()} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
          <Camera className="size-4" /> {t("avatar.photo")}
        </button>
        {av.kind !== "default" && (
          <button type="button" onClick={() => setAvatar({ kind: "default" })} className="rounded-full border border-border px-4 py-2.5 text-sm">{t("avatar.reset")}</button>
        )}
      </div>
      <input
        ref={file}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try { setErr(false); setAvatar({ kind: "photo", value: await photoToAvatar(f) }); } catch { setErr(true); }
        }}
      />
      {err && <p className="text-xs text-red-300">{t("avatar.err")}</p>}
      <p className="text-xs text-muted-foreground">{t("avatar.note")}</p>
    </div>
  );
}
