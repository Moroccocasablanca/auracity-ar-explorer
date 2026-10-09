import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "it" | "en";

const dict = {
  it: {
    "nav.ar": "AR",
    "nav.explore": "Esplora",
    "nav.business": "Business",
    "tagline": "La città, a strati di realtà.",
    "ar.enter": "Entra in AR",
    "ar.enter.sub": "Attiva fotocamera, GPS e bussola per vedere i nodi digitali di Bra attorno a te.",
    "ar.demo": "Modalità demo a Bra",
    "ar.demo.note": "Posizione simulata in Piazza Caduti della Libertà. Trascina per ruotare. Le interazioni richiedono presenza reale.",
    "ar.nogps": "GPS non disponibile: uso la modalità demo.",
    "ar.outside": "Sei lontano da Bra: uso la modalità demo.",
    "ar.nocamera": "Fotocamera non disponibile: sfondo digitale.",
    "ar.nearby": "nodi vicino a te",
    "ar.none": "Nessun nodo nel raggio. Cammina verso il centro di Bra.",
    "ar.range": "Raggio",
    "ar.inrange": "In raggio",
    "ar.open": "Apri nodo",
    "ar.stop": "Esci",
    "ar.calibrate": "Muovi il telefono a forma di 8 per calibrare la bussola.",
    "kind.business": "Attività",
    "kind.monument": "Monumento",
    "kind.street": "Via",
    "kind.service": "Servizio",
    "all": "Tutti",
    "explore.title": "Nodi di Bra",
    "explore.sub": "Ogni strada, monumento e attività della città pilota.",
    "node.back": "Esplora",
    "node.menu": "Menu",
    "node.promo": "Offerta di prossimità",
    "node.messages": "Messaggi",
    "node.reviews": "Recensioni",
    "node.address": "Indirizzo",
    "node.hours": "Orari",
    "node.open": "Aperto ora",
    "node.closed": "Chiuso ora",
    "node.distance": "Distanza",
    "node.presence.ok": "Sei nel raggio: puoi interagire.",
    "node.presence.far": "Per interagire devi essere entro {r} m dal nodo (ora a {d}).",
    "node.presence.nopos": "Attiva la posizione per interagire.",
    "node.presence.demo": "Modalità demo: interazioni disabilitate (serve presenza fisica).",
    "node.presence.enable": "Attiva posizione",
    "form.name": "Il tuo nome",
    "form.message": "Scrivi un messaggio…",
    "form.send": "Invia",
    "form.sending": "Controllo contenuto…",
    "form.review": "Racconta la tua esperienza…",
    "form.receipt": "Codice scontrino",
    "form.receipt.scan": "Scansiona QR",
    "form.receipt.hint": "Il QR sullo scontrino sblocca la recensione. Demo: BRA-BUCH-0001…0005",
    "form.rating": "Voto",
    "form.publish": "Pubblica recensione",
    "form.sent": "Pubblicato!",
    "reviews.closed": "Recensioni sospese: l'attività è chiusa. Riprova durante l'orario di apertura.",
    "reviews.empty": "Ancora nessuna recensione.",
    "messages.empty": "Nessun messaggio qui. Lascia il primo!",
    "err.too_far": "Sei troppo lontano dal nodo (a {d} m).",
    "err.weak_gps": "Segnale GPS troppo debole. Spostati all'aperto e riprova.",
    "err.closed": "Recensioni sospese: l'attività è chiusa.",
    "err.bad_receipt": "Codice scontrino non valido o già usato.",
    "err.not_business": "Solo le attività possono ricevere recensioni.",
    "err.not_found": "Nodo non trovato.",
    "err.personal_data": "Contiene dati personali o link: non consentito.",
    "err.profanity": "Linguaggio offensivo bloccato.",
    "err.hate": "Contenuti d'odio bloccati.",
    "err.spam": "Contenuto promozionale o spam bloccato.",
    "err.unavailable": "Servizio non disponibile, riprova tra poco.",
    "biz.title": "Porta la tua attività nella realtà aumentata",
    "biz.sub": "Un avatar AR davanti al tuo locale, menu sempre aggiornato e campagne che raggiungono chi è a pochi passi.",
    "biz.f1": "Avatar AR del tuo locale",
    "biz.f1d": "Una presenza digitale fissata al tuo ingresso, visibile a chi passa.",
    "biz.f2": "Menu e offerte",
    "biz.f2d": "Aggiorna listino e promozioni di prossimità in tempo reale.",
    "biz.f3": "Recensioni verificate",
    "biz.f3d": "Solo chi è presente e ha lo scontrino QR può recensire. Niente sabotaggi.",
    "biz.sub.title": "Abbonamento B2B",
    "biz.sub.text": "Le attività si abbonano per gestire avatar, menu e campagne. Prezzi in definizione per il pilota di Bra.",
    "biz.user.title": "Per gli utenti: freemium",
    "biz.free": "Gratis",
    "biz.free1": "Raggio di scoperta 250 m",
    "biz.free2": "Skin AR base",
    "biz.prem": "Premium",
    "biz.prem1": "Raggio esteso fino a 1 km",
    "biz.prem2": "Skin AR personalizzate",
    "biz.soon": "In arrivo",
    "safety.title": "Sicurezza integrata",
    "safety.1": "Filtro LLM in tempo reale: niente insulti, odio o dati sensibili.",
    "safety.2": "Presenza fisica obbligatoria entro 30 m dal nodo.",
    "safety.3": "Recensioni sospese fuori dagli orari di apertura.",
  },
  en: {
    "nav.ar": "AR",
    "nav.explore": "Explore",
    "nav.business": "Business",
    "tagline": "The city, in layers of reality.",
    "ar.enter": "Enter AR",
    "ar.enter.sub": "Turn on camera, GPS and compass to see Bra's digital nodes around you.",
    "ar.demo": "Demo mode in Bra",
    "ar.demo.note": "Simulated position at Piazza Caduti della Libertà. Drag to rotate. Interactions require real presence.",
    "ar.nogps": "GPS unavailable: using demo mode.",
    "ar.outside": "You're far from Bra: using demo mode.",
    "ar.nocamera": "Camera unavailable: digital backdrop.",
    "ar.nearby": "nodes near you",
    "ar.none": "No nodes in range. Walk toward the centre of Bra.",
    "ar.range": "Range",
    "ar.inrange": "In range",
    "ar.open": "Open node",
    "ar.stop": "Exit",
    "ar.calibrate": "Move your phone in a figure-8 to calibrate the compass.",
    "kind.business": "Business",
    "kind.monument": "Monument",
    "kind.street": "Street",
    "kind.service": "Service",
    "all": "All",
    "explore.title": "Nodes of Bra",
    "explore.sub": "Every street, monument and business of the pilot city.",
    "node.back": "Explore",
    "node.menu": "Menu",
    "node.promo": "Proximity offer",
    "node.messages": "Messages",
    "node.reviews": "Reviews",
    "node.address": "Address",
    "node.hours": "Hours",
    "node.open": "Open now",
    "node.closed": "Closed now",
    "node.distance": "Distance",
    "node.presence.ok": "You're in range: you can interact.",
    "node.presence.far": "To interact you must be within {r} m of the node (now {d}).",
    "node.presence.nopos": "Enable location to interact.",
    "node.presence.demo": "Demo mode: interactions disabled (physical presence required).",
    "node.presence.enable": "Enable location",
    "form.name": "Your name",
    "form.message": "Write a message…",
    "form.send": "Send",
    "form.sending": "Checking content…",
    "form.review": "Tell us about your experience…",
    "form.receipt": "Receipt code",
    "form.receipt.scan": "Scan QR",
    "form.receipt.hint": "The QR on your receipt unlocks reviews. Demo: BRA-BUCH-0001…0005",
    "form.rating": "Rating",
    "form.publish": "Publish review",
    "form.sent": "Published!",
    "reviews.closed": "Reviews are paused: the business is closed. Try again during opening hours.",
    "reviews.empty": "No reviews yet.",
    "messages.empty": "No messages here. Leave the first one!",
    "err.too_far": "You're too far from the node ({d} m away).",
    "err.weak_gps": "GPS signal too weak. Move outdoors and try again.",
    "err.closed": "Reviews are paused: the business is closed.",
    "err.bad_receipt": "Receipt code invalid or already used.",
    "err.not_business": "Only businesses can receive reviews.",
    "err.not_found": "Node not found.",
    "err.personal_data": "Contains personal data or links: not allowed.",
    "err.profanity": "Offensive language blocked.",
    "err.hate": "Hateful content blocked.",
    "err.spam": "Promotional content or spam blocked.",
    "err.unavailable": "Service unavailable, please try again shortly.",
    "biz.title": "Bring your business into augmented reality",
    "biz.sub": "An AR avatar at your door, an always-current menu, and campaigns that reach people steps away.",
    "biz.f1": "AR avatar for your venue",
    "biz.f1d": "A digital presence anchored at your entrance, visible to passers-by.",
    "biz.f2": "Menu and offers",
    "biz.f2d": "Update your menu and proximity promotions in real time.",
    "biz.f3": "Verified reviews",
    "biz.f3d": "Only people present with a QR receipt can review. No sabotage.",
    "biz.sub.title": "B2B subscription",
    "biz.sub.text": "Businesses subscribe to manage their avatar, menu and campaigns. Pricing is being defined for the Bra pilot.",
    "biz.user.title": "For users: freemium",
    "biz.free": "Free",
    "biz.free1": "250 m discovery range",
    "biz.free2": "Basic AR skin",
    "biz.prem": "Premium",
    "biz.prem1": "Extended range up to 1 km",
    "biz.prem2": "Custom AR skins",
    "biz.soon": "Coming soon",
    "safety.title": "Built-in safety",
    "safety.1": "Real-time LLM filter: no insults, hate or sensitive data.",
    "safety.2": "Physical presence required within 30 m of the node.",
    "safety.3": "Reviews paused outside business opening hours.",
  },
} as const;

export type TKey = keyof (typeof dict)["it"];

export const kindKey = (k: string) => `kind.${k}` as TKey;

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("it");

  useEffect(() => {
    const saved = localStorage.getItem("aura_lang");
    if (saved === "it" || saved === "en") {
      setLangState(saved);
    } else {
      setLangState(navigator.language?.toLowerCase().startsWith("it") ? "it" : "en");
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("aura_lang", l);
  }, []);

  const t = useCallback<Ctx["t"]>(
    (key, vars) => {
      let s: string = dict[lang][key];
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      return s;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside provider");
  return ctx;
}
