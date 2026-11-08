// Automatic check that the person who signs up as a venue's owner really is (nobody from the app reviews anything by hand).
// Every check gives a signal; `scoreClaim` joins them into ONE decision. The signals must come from the server (never from the phone),
// and the venue stays "in prova" (no offers, no payments) until the decision is "approved".
//
// Signals:
//  - email confirmed (link) and, better, an email on the venue's own website domain
//  - a code sent to the venue's OWN public phone number (strongest: only whoever holds that phone can type it)
//  - the person is physically at the venue (GPS)
//  - the VAT number (partita IVA) exists and its registered name / address match the venue (EU VIES)
//  - a live photo of the venue's sign or menu, read by the AI, whose name matches the venue

export type Signals = {
  venueName: string;
  venueAddress?: string;
  /** the venue has a public phone number we can send the code to */
  venueHasPhone: boolean;
  emailConfirmed: boolean;
  emailOnVenueDomain?: boolean;
  phoneCodeOk?: boolean | undefined;
  /** metres between the person (GPS) and the venue when the claim was made, null if unknown */
  distanceM?: number | null;
  vat?: { valid: boolean; name?: string | undefined; address?: string | undefined } | null;
  photo?: { nameMatches: boolean; live: boolean; confidence: number } | null;
};

export type Decision = { decision: "approved" | "needs_more" | "rejected"; score: number; reasons: string[]; missing: string[] };

const STOP = new Set(["srl", "sas", "snc", "spa", "di", "e", "il", "la", "lo", "da", "bar", "ristorante", "trattoria", "pizzeria", "osteria", "caffe", "cafe", "the", "del", "della", "dei"]);
const tokens = (s: string) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));

/** 0..1: how much of the venue's name (or address) appears in the registered one. */
export function similarity(a: string, b: string): number {
  const A = tokens(a);
  const B = new Set(tokens(b));
  if (!A.length || !B.size) return 0;
  return A.filter((w) => B.has(w)).length / A.length;
}

export function scoreClaim(s: Signals): Decision {
  const reasons: string[] = [];
  const missing: string[] = [];
  let score = 0;

  if (!s.emailConfirmed) return { decision: "needs_more", score: 0, reasons, missing: ["email"] };
  score += 10;
  if (s.emailOnVenueDomain) { score += 10; reasons.push("email del locale"); }

  if (s.venueHasPhone) {
    if (s.phoneCodeOk) { score += 40; reasons.push("codice ricevuto sul telefono del locale"); }
    else missing.push("codice al telefono del locale");
  }

  if (s.distanceM == null) missing.push("posizione sul posto");
  else if (s.distanceM <= 40) { score += 15; reasons.push("presente sul posto"); }
  else if (s.distanceM > 150) return { decision: "rejected", score, reasons: [...reasons, "lontano dal locale"], missing };
  else missing.push("avvicinarsi al locale");

  if (s.vat == null) missing.push("partita IVA");
  else if (!s.vat.valid) return { decision: "rejected", score, reasons: [...reasons, "partita IVA non valida"], missing };
  else {
    const nameOk = s.vat.name ? similarity(s.venueName, s.vat.name) >= 0.5 : false;
    const addrOk = s.vat.address && s.venueAddress ? similarity(s.venueAddress, s.vat.address) >= 0.5 : false;
    if (nameOk || addrOk) { score += 20; reasons.push("partita IVA coerente con il locale"); }
    else { score += 5; missing.push("partita IVA intestata a un altro nome: serve la foto dell'insegna"); }
  }

  if (s.photo == null) missing.push("foto dal vivo dell'insegna o del menu");
  else if (s.photo.live && s.photo.nameMatches && s.photo.confidence >= 0.7) { score += 15; reasons.push("foto dell'insegna riconosciuta"); }
  else missing.push("foto non riconosciuta: riprova davanti al locale");

  // The strongest proof must be there: the phone code, or (when the venue has no public phone) VAT + live photo + presence together.
  const strong = s.venueHasPhone ? s.phoneCodeOk === true : Boolean(s.vat?.valid) && s.photo?.live === true && s.photo.nameMatches && (s.distanceM ?? 999) <= 40;
  if (score >= 70 && strong) return { decision: "approved", score, reasons, missing: [] };
  return { decision: "needs_more", score, reasons, missing };
}
