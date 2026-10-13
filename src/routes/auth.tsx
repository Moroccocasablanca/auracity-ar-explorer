import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Coffee, Loader2, MailCheck, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { Tables } from "@/integrations/supabase/types";
import { useSession } from "@/lib/auth";
import { useI18n, type TKey } from "@/lib/i18n";
import { PASSWORD_RULES, isStrongPassword } from "@/lib/password";
import { FriendsPanel } from "@/components/account/FriendsPanel";
import { AdminTools } from "@/components/admin/AdminTools";
import { LanguageSelect } from "@/components/account/LanguageSelect";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AURACITY Bra" },
      { name: "description", content: "Create a free visitor account or a business account for your bar or restaurant in Bra." },
      { property: "og:title", content: "Sign in — AURACITY Bra" },
      { property: "og:description", content: "Free visitor accounts and business accounts for venues in Bra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const inputCls =
  "w-full rounded-xl border border-input bg-secondary/60 px-3 py-2.5 text-sm outline-none focus:border-primary";

function authErrorKey(message: string, code?: string): TKey {
  const m = `${code ?? ""} ${message}`.toLowerCase();
  if (m.includes("not confirmed") || m.includes("email_not_confirmed")) return "auth.err.unconfirmed";
  if (m.includes("invalid login") || m.includes("invalid_credentials")) return "auth.err.invalid";
  if (m.includes("already") || m.includes("user_already_exists")) return "auth.err.exists";
  if (m.includes("weak") || m.includes("pwned") || m.includes("password")) return "auth.err.weak";
  if (m.includes("rate") || m.includes("too many")) return "auth.err.rate";
  if (m.includes("email")) return "auth.err.email";
  return "auth.error";
}

function AuthPage() {
  const { session, ready } = useSession();
  if (!ready) return <div className="min-h-screen" />;
  return session ? <Account userId={session.user.id} email={session.user.email ?? ""} /> : <SignIn />;
}

function SignIn() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [type, setType] = useState<"user" | "business">("user");
  const [bizName, setBizName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [adult, setAdult] = useState(false);

  const strong = isStrongPassword(password);
  const canSubmit =
    email.includes("@") &&
    (mode === "login" ? password.length > 0 : strong && adult && (type === "user" || bizName.trim().length >= 2));

  async function submit() {
    setBusy(true);
    setUnconfirmed(false);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { account_type: type, business_name: type === "business" ? bizName.trim() : undefined, adult_confirmed_at: new Date().toISOString() },
          },
        });
        if (error) return void toast.error(t(authErrorKey(error.message, error.code)));
        if (data.user && data.user.identities?.length === 0) return void toast.error(t("auth.err.exists"));
        if (!data.session) setSentTo(email.trim());
        else navigate({ to: "/explore" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          const key = authErrorKey(error.message, error.code);
          if (key === "auth.err.unconfirmed") setUnconfirmed(true);
          return void toast.error(t(key));
        }
        navigate({ to: "/explore" });
      }
    } catch {
      toast.error(t("auth.error"));
    } finally {
      setBusy(false);
    }
  }

  async function resend(addr: string) {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: addr,
      options: { emailRedirectTo: `${window.location.origin}/auth` },
    });
    if (error) toast.error(t(authErrorKey(error.message, error.code)));
    else toast.success(t("auth.resent"));
  }

  async function google() {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth` });
    if (res.error) toast.error(t("auth.error"));
  }

  if (sentTo) {
    return (
      <div className="grid-backdrop flex min-h-screen items-center px-6 pb-32">
        <div className="glass mx-auto w-full max-w-sm space-y-4 rounded-2xl p-6 text-center">
          <MailCheck className="mx-auto size-10 text-primary" />
          <h1 className="text-2xl font-bold">{t("auth.checkTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("auth.checkBody", { e: sentTo })}</p>
          <button type="button" onClick={() => resend(sentTo)} className="text-sm text-primary underline">
            {t("auth.resend")}
          </button>
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setMode("login");
            }}
            className="h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            {t("auth.login")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid-backdrop flex min-h-screen items-center px-6 pb-32 pt-10">
      <div className="mx-auto w-full max-w-sm space-y-5">
        <LanguageSelect />
        <AdminTools />
        <header>
          <p className="mono-label">AURACITY</p>
          <h1 className="mt-1 text-3xl font-bold">{mode === "login" ? t("auth.title") : t("auth.signup")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.sub")}</p>
        </header>

        {mode === "signup" && (
          <fieldset className="space-y-2">
            <legend className="mono-label mb-2">{t("auth.type")}</legend>
            {(
              [
                { v: "user", Icon: UserRound, l: "auth.type.user", d: "auth.type.user.d" },
                { v: "business", Icon: Coffee, l: "auth.type.business", d: "auth.type.business.d" },
              ] as const
            ).map(({ v, Icon, l, d }) => (
              <button
                key={v}
                type="button"
                onClick={() => setType(v)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                  type === v ? "border-primary bg-primary/10" : "border-border bg-card/60"
                }`}
              >
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-semibold">{t(l)}</span>
                  <span className="block text-xs text-muted-foreground">{t(d)}</span>
                </span>
              </button>
            ))}
            {type === "business" && (
              <input
                className={inputCls}
                placeholder={t("auth.businessName")}
                value={bizName}
                maxLength={80}
                onChange={(e) => setBizName(e.target.value)}
              />
            )}
          </fieldset>
        )}

        {mode === "login" && (
          <button
            type="button"
            onClick={google}
            className="h-11 w-full rounded-full border border-border text-sm font-medium hover:bg-accent"
          >
            {t("auth.google")}
          </button>
        )}

        <div className="space-y-2">
          <input
            className={inputCls}
            type="email"
            autoComplete="email"
            placeholder={t("auth.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={inputCls}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "signup" && (
            <div className="rounded-xl border border-border bg-card/60 p-3 text-xs">
              <p className="mb-1.5 text-muted-foreground">{t("auth.password.rules")}</p>
              <ul className="space-y-1">
                {PASSWORD_RULES.map((r) => {
                  const ok = r.test(password);
                  return (
                    <li key={r.key} className={`flex items-center gap-2 ${ok ? "text-success" : "text-muted-foreground"}`}>
                      {ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                      {t(`pw.${r.key}` as TKey)}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {mode === "signup" && (
            <label className="flex items-start gap-2 rounded-xl border border-border bg-card/60 p-3 text-xs">
              <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
              <span>{t("auth.adult")}</span>
            </label>
          )}
          <button
            type="button"
            disabled={busy || !canSubmit}
            onClick={submit}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === "login" ? t("auth.login") : t("auth.signup")}
          </button>
          {unconfirmed && (
            <button type="button" onClick={() => resend(email.trim())} className="w-full text-center text-sm text-primary underline">
              {t("auth.resend")}
            </button>
          )}
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

function Account({ userId, email }: { userId: string; email: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [userId]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isBiz = profile?.account_type === "business";
  return (
    <div className="grid-backdrop flex min-h-screen items-center px-6 pb-32">
      <div className="glass mx-auto w-full max-w-sm space-y-4 rounded-2xl p-6">
        <LanguageSelect />
        <AdminTools />
        <p className="text-sm text-muted-foreground">{t("auth.signed", { e: email })}</p>
        {profile && (
          <div>
            <p className="mono-label">{t("account.type")}</p>
            <p className="mt-1 font-semibold">{isBiz ? t("auth.type.business") : t("auth.type.user")}</p>
            {isBiz && (
              <>
                {profile.business_name && <p className="text-sm">{profile.business_name}</p>}
                <p className="mt-2 rounded-xl border border-kind-business/40 bg-kind-business/10 px-3 py-2 text-sm">
                  {profile.business_status === "active" ? t("account.biz.active") : t("account.biz.pending")}
                </p>
              </>
            )}
          </div>
        )}
        <FriendsPanel userId={userId} />
        <button type="button" onClick={signOut} className="h-11 w-full rounded-full border border-border text-sm font-medium">
          {t("auth.logout")}
        </button>
      </div>
    </div>
  );
}
