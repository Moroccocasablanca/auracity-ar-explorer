import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AURACITY Bra" },
      { name: "description", content: "Create an AURACITY account to leave geotagged messages on benches in Bra." },
      { property: "og:title", content: "Sign in — AURACITY Bra" },
      { property: "og:description", content: "Create an AURACITY account to leave geotagged messages in Bra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const inputCls =
  "w-full rounded-xl border border-input bg-secondary/60 px-3 py-2.5 text-sm outline-none focus:border-primary";

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { session } = useSession();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) toast.success(t("auth.check"));
        else navigate({ to: "/explore" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/explore" });
      }
    } catch {
      toast.error(t("auth.error"));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) toast.error(t("auth.error"));
  }

  if (session) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
        <p className="text-muted-foreground">{t("auth.signed", { e: session.user.email ?? "" })}</p>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="h-11 rounded-full border border-border text-sm font-medium"
        >
          {t("auth.logout")}
        </button>
      </div>
    );
  }

  return (
    <div className="grid-backdrop flex min-h-screen items-center px-6 pb-32">
      <div className="mx-auto w-full max-w-sm space-y-5">
        <header>
          <p className="mono-label">AURACITY</p>
          <h1 className="mt-1 text-3xl font-bold">{t("auth.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.sub")}</p>
        </header>
        <button
          type="button"
          onClick={google}
          className="h-11 w-full rounded-full border border-border text-sm font-medium hover:bg-accent"
        >
          {t("auth.google")}
        </button>
        <div className="space-y-2">
          <input className={inputCls} type="email" placeholder={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            className={inputCls}
            type="password"
            placeholder={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            disabled={busy || !email.includes("@") || password.length < 8}
            onClick={submit}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === "login" ? t("auth.login") : t("auth.signup")}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="w-full text-center text-sm text-primary underline"
        >
          {mode === "login" ? t("auth.toSignup") : t("auth.toLogin")}
        </button>
      </div>
    </div>
  );
}
