import { createFileRoute } from "@tanstack/react-router";
import { Check, Lock, MapPinned, ShieldCheck, Store, Megaphone, BadgeCheck } from "lucide-react";
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

const features: { Icon: typeof Store; t: TKey; d: TKey }[] = [
  { Icon: Store, t: "biz.f1", d: "biz.f1d" },
  { Icon: Megaphone, t: "biz.f2", d: "biz.f2d" },
  { Icon: BadgeCheck, t: "biz.f3", d: "biz.f3d" },
];

function Business() {
  const { t } = useI18n();
  return (
    <div className="grid-backdrop min-h-screen px-4 pb-32 pt-10">
      <div className="mx-auto max-w-xl space-y-10">
        <header>
          <p className="mono-label">B2B · Proximity marketing</p>
          <h1 className="mt-1 text-4xl font-bold leading-tight">{t("biz.title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("biz.sub")}</p>
        </header>

        <ul className="space-y-3">
          {features.map(({ Icon, t: title, d }) => (
            <li key={title} className="glass flex gap-4 rounded-2xl p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-semibold">{t(title)}</p>
                <p className="text-sm text-muted-foreground">{t(d)}</p>
              </div>
            </li>
          ))}
        </ul>

        <section className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
          <p className="mono-label" style={{ color: "var(--primary)" }}>
            {t("biz.sub.title")}
          </p>
          <p className="mt-2 text-sm">{t("biz.sub.text")}</p>
        </section>

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
