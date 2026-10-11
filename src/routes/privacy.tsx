import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Privacy — AURACITY Bra" },
    { name: "description", content: "How AURACITY uses camera, location, notifications and account data during the Bra pilot." },
    { property: "og:title", content: "Privacy — AURACITY Bra" },
    { property: "og:description", content: "Camera, location, notification and account-data privacy for AURACITY." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { t } = useI18n();
  return <main className="grid-backdrop min-h-screen px-5 pb-32 pt-10"><article className="mx-auto max-w-2xl">
    <p className="mono-label">AURACITY · GDPR</p><h1 className="mt-2 text-4xl font-bold">{t("privacy.title")}</h1><p className="mt-3 text-muted-foreground">{t("privacy.intro")}</p>
    {(["camera","location","notifications","account","cookies","rights"] as const).map((key) => <section key={key} className="mt-7 border-t border-border pt-5"><h2 className="text-xl font-semibold">{t(`privacy.${key}.title`)}</h2><p className="mt-2 whitespace-pre-line leading-relaxed text-muted-foreground">{t(`privacy.${key}.body`)}</p></section>)}
  </article></main>;
}