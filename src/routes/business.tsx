import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, Check, Lock, MapPinned, ShieldCheck, Store, Megaphone, BadgeCheck } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: "AURACITY for Business — AR avatars and proximity marketing" },
      {
        name: "description",
        content:
          "Local businesses subscribe to manage their AR avatar, publish menus and run proximity campaigns with verified reviews.",
      },
      { property: "og:title", content: "AURACITY for Business — AR avatars and proximity marketing" },
      {
        property: "og:description",
        content:
          "Local businesses subscribe to manage their AR avatar, publish menus and run proximity campaigns with verified reviews.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Business,
});

const features: { Icon: typeof Store; t: TKey; d: TKey; more: TKey; to: string; go: TKey }[] = [
  { Icon: Store, t: "biz.f1", d: "biz.f1d", more: "biz.f1m", to: "/", go: "biz.go.ar" },
  { Icon: Megaphone, t: "biz.f2", d: "biz.f2d", more: "biz.f2m", to: "/node/bucheria", go: "biz.go.venue" },
  { Icon: BadgeCheck, t: "biz.f3", d: "biz.f3d", more: "biz.f3m", to: "/node/bucheria", go: "biz.go.venue" },
];

const PLANS: { id: "start" | "pro"; price: string; name: TKey; items: TKey[] }[] = [
  { id: "start", price: "29", name: "biz.plan.start", items: ["biz.pl.pin", "biz.pl.menu", "biz.pl.reviews"] },
  { id: "pro", price: "59", name: "biz.plan.pro", items: ["biz.pl.pin", "biz.pl.menu", "biz.pl.reviews", "biz.pl.flash", "biz.pl.voice", "biz.pl.stats", "biz.pl.menu3d"] },
];
const LEADS = "aura_biz_leads";

function Plans() {
  const { t } = useI18n();
  const [plan, setPlan] = useState<"start" | "pro">("pro");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);
  const field = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm";
  const send = () => {
    if (!name.trim() || !contact.trim()) return;
    try {
      const all = JSON.parse(localStorage.getItem(LEADS) ?? "[]") as unknown[];
      localStorage.setItem(LEADS, JSON.stringify([{ plan, name: name.trim(), contact: contact.trim(), at: new Date().toISOString() }, ...all].slice(0, 50)));
    } catch { /* ignore */ }
    setSent(true);
  };
  return (
    <section>
      <h2 className="mb-1 text-xl font-semibold">{t("biz.plans.title")}</h2>
      <p className="mb-3 text-xs text-muted-foreground">{t("biz.plans.note")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {PLANS.map((p) => (
          <button key={p.id} type="button" onClick={() => setPlan(p.id)} className={`glass rounded-2xl p-4 text-left transition ${plan === p.id ? "border-2 border-primary" : "border border-border"}`}>
            <p className="flex items-baseline justify-between font-semibold">{t(p.name)}<span className="text-2xl font-bold">€{p.price}<span className="text-xs font-normal text-muted-foreground">{t("biz.month")}</span></span></p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              {p.items.map((k) => <li key={k} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" /> {t(k)}</li>)}
            </ul>
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-2 rounded-2xl border border-primary/40 bg-primary/5 p-4">
        {sent ? (
          <p className="text-sm font-semibold text-green-300">✓ {t("biz.sent")}</p>
        ) : (
          <>
            <p className="font-semibold">{t("biz.req.title")}</p>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("biz.req.name")} />
            <input className={field} value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t("biz.req.contact")} />
            <button type="button" onClick={send} className="w-full rounded-full bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground">{t("biz.req.go")}</button>
            <p className="text-xs text-muted-foreground">{t("biz.req.note")}</p>
          </>
        )}
      </div>
    </section>
  );
}

function Business() {
  const { t } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid-backdrop min-h-screen px-4 pb-32 pt-10">
      <div className="mx-auto max-w-xl space-y-10">
        <header>
          <p className="mono-label">B2B · Proximity marketing</p>
          <h1 className="mt-1 text-4xl font-bold leading-tight">{t("biz.title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("biz.sub")}</p>
        </header>

        <ul className="space-y-3">
          {features.map(({ Icon, t: title, d, more, to, go }) => (
            <li key={title} className="glass rounded-2xl">
              <button type="button" aria-expanded={open === title} onClick={() => setOpen(open === title ? null : title)} className="flex w-full gap-4 p-4 text-left">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{t(title)}</p>
                  <p className="text-sm text-muted-foreground">{t(d)}</p>
                </div>
                <ChevronDown className={`mt-1 size-5 shrink-0 transition ${open === title ? "rotate-180" : ""}`} />
              </button>
              {open === title && (
                <div className="space-y-3 px-4 pb-4 text-sm">
                  <p>{t(more)}</p>
                  <Link to={to} className="inline-block rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground">{t(go)} →</Link>
                </div>
              )}
            </li>
          ))}
        </ul>

        <Plans />

        <section>
          <h2 className="mb-3 text-xl font-semibold">{t("biz.user.title")}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-2xl p-4">
              <p className="font-semibold">{t("biz.free")}</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {(["biz.free1", "biz.free2"] as const).map((k) => (
                  <li key={k} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" /> {t(k)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass rounded-2xl border-primary/40 p-4">
              <p className="flex items-center justify-between font-semibold">
                {t("biz.prem")}
                <span className="mono-label !text-[0.55rem]">{t("biz.soon")}</span>
              </p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {(["biz.prem1", "biz.prem2"] as const).map((k) => (
                  <li key={k} className="flex gap-2">
                    <Lock className="mt-0.5 size-4 shrink-0 text-primary" /> {t(k)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
            <ShieldCheck className="size-5 text-primary" /> {t("safety.title")}
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {(["safety.1", "safety.2", "safety.3"] as const).map((k) => (
              <li key={k} className="flex gap-3">
                <MapPinned className="mt-0.5 size-4 shrink-0 text-primary" /> {t(k)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
