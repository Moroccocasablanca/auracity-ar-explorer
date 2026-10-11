import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const KEY = "aura_privacy_consent_v1";

export function PrivacyConsent() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(localStorage.getItem(KEY) !== "accepted"), []);
  if (!open) return null;
  return <div className="fixed inset-0 z-[1000] flex items-end bg-background/80 p-4 backdrop-blur-sm sm:items-center sm:justify-center">
    <section role="dialog" aria-modal="true" aria-labelledby="privacy-consent-title" className="w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-xl">
      <h2 id="privacy-consent-title" className="text-xl font-bold">{t("consent.title")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("consent.body")}</p>
      <ul className="mt-4 space-y-2 text-sm"><li>{t("consent.camera")}</li><li>{t("consent.location")}</li><li>{t("consent.notifications")}</li><li>{t("consent.storage")}</li></ul>
      <Link to="/privacy" className="mt-4 inline-block text-sm text-primary underline">{t("privacy.read")}</Link>
      <Button className="mt-5 w-full" onClick={() => { localStorage.setItem(KEY, "accepted"); setOpen(false); }}>{t("consent.accept")}</Button>
    </section>
  </div>;
}