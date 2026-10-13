// Menu, offer, verified reviews and avatar of a venue, edited from the admin box. In this test version it is kept on the phone;
// with the venue subscription the same fields come from the database.
import { useEffect, useState } from "react";
import type { NodeRow } from "./nodes";

export type VenueReview = { author: string; stars: number; body: string; when: string };
export type VenueContent = {
  offer?: string | undefined;
  specials?: string | undefined;
  menu?: { name: string; price: number }[] | undefined;
  reviews?: VenueReview[] | undefined;
  /** Live classes of a gym or sports place, valid every day: "18:30-19:30 | Yoga" */
  classes?: { title: string; start: string; end: string }[] | undefined;
  /** Who speaks for this venue: a woman or a man, chosen by the venue. */
  voice?: "female" | "male" | undefined;
  /** The menu is shown as a 3D carousel. */
  has3DMenu?: boolean | undefined;
};

const KEY = "aura_venue_content";
const EVENT = "aura-venue-content";

function all(): Record<string, VenueContent> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, VenueContent>;
  } catch {
    return {};
  }
}
/** Starting content for venues used in the pilot test (clearly examples, until the owner fills in the real ones). */
const SEED: Record<string, VenueContent> = {
  // Bar della Stazione
  "2f658c55-615c-41ee-b876-3d5431d9c760": {
    offer: "Caffè e brioche a 1,50 euro, dalle sette alle dieci",
    specials: "Oggi: panino col prosciutto cotto e toast. Cappuccino e brioche appena fatta.",
    menu: [
      { name: "Caffè (esempio)", price: 1.1 },
      { name: "Cappuccino (esempio)", price: 1.6 },
      { name: "Brioche (esempio)", price: 1.4 },
      { name: "Panino prosciutto (esempio)", price: 4.5 },
      { name: "Toast (esempio)", price: 3.5 },
    ],
    voice: "male",
    has3DMenu: true,
  },
};
export const getVenueContent = (id: string): VenueContent => all()[id] ?? SEED[id] ?? {};
export function setVenueContent(id: string, c: VenueContent) {
  const a = all();
  const empty = !c.offer && !c.specials && !(c.menu?.length) && !(c.reviews?.length) && !(c.classes?.length) && !c.has3DMenu;
  if (empty) delete a[id];
  else a[id] = c;
  localStorage.setItem(KEY, JSON.stringify(a));
  window.dispatchEvent(new Event(EVENT));
}

export function useVenueContent(node: NodeRow): VenueContent {
  const [c, setC] = useState<VenueContent>({});
  useEffect(() => {
    const read = () => setC(getVenueContent(node.id));
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, [node.id]);
  return c;
}

/** Example for the pilot: clearly an example, with made-up dishes and reviews so the layout can be judged. */
export const EXAMPLE: VenueContent = {
  offer: "ESEMPIO · Con il pranzo, il caffè è offerto dalla casa. Mostra questa schermata al tavolo.",
  specials: "ESEMPIO · Piatto del giorno: tagliatelle al ragù. Dolce del giorno: panna cotta.",
  menu: [
    { name: "Tagliatelle al ragù (esempio)", price: 11 },
    { name: "Vitello tonnato (esempio)", price: 12 },
    { name: "Risotto del giorno (esempio)", price: 13 },
    { name: "Panna cotta (esempio)", price: 6 },
  ],
  reviews: [
    { author: "Chiara", stars: 5, body: "Esempio di recensione verificata: servizio gentile e piatti curati.", when: "oggi, 13:12" },
    { author: "Marco", stars: 4, body: "Esempio: ottimo posto per una pausa a metà giornata.", when: "ieri, 20:40" },
  ],
};

/** "18:30-19:30 | Yoga" per line → classes. */
export function parseClasses(text: string): { title: string; start: string; end: string }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .map((l) => l.match(/^(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})\s*\|\s*(.+)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => ({ start: `${m[1]!.padStart(2, "0")}:${m[2]}`, end: `${m[3]!.padStart(2, "0")}:${m[4]}`, title: m[5]!.trim() }));
}
export const classesToText = (c: { title: string; start: string; end: string }[] = []) => c.map((k) => `${k.start}-${k.end} | ${k.title}`).join("\n");

/** Example for a gym: clearly made up, to judge the layout. */
export const GYM_EXAMPLE: VenueContent = {
  offer: "ESEMPIO · Prima lezione di prova gratuita: porta questa schermata alla reception.",
  classes: [
    { title: "Yoga (esempio)", start: "18:30", end: "19:30" },
    { title: "CrossFit (esempio)", start: "19:45", end: "20:45" },
    { title: "Pilates (esempio)", start: "09:30", end: "10:30" },
    { title: "Spinning (esempio)", start: "12:30", end: "13:15" },
  ],
};

/** "Piatto | 12" per line → menu items. */
export function parseMenu(text: string): { name: string; price: number }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [name, price] = l.split("|").map((x) => x.trim());
      return { name: name ?? l, price: Number((price ?? "0").replace(",", ".").replace(/[^\d.]/g, "")) || 0 };
    });
}
export const menuToText = (menu: { name: string; price: number }[] = []) => menu.map((m) => `${m.name} | ${m.price}`).join("\n");
