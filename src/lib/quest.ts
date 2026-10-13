// Adventure progress (missions, stars, riddles, venue stamps). Lives on the phone only: no accounts, no tracking.
import { romeDate } from "./geo";
import type { Lang } from "./i18n";

export type QuestEventType = "char" | "monument" | "stamp" | "riddle";
type QuestEvent = { t: QuestEventType; id: string; day: string };

const KEY = "aura_quest_events";
const POINTS: Record<QuestEventType, number> = { char: 2, monument: 1, stamp: 2, riddle: 3 };

function read(): QuestEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as QuestEvent[];
  } catch {
    return [];
  }
}

export const today = () => romeDate(new Date());

/** Records an event once per day per item (so stars cannot be farmed by tapping repeatedly). */
export function logEvent(t: QuestEventType, id: string) {
  if (typeof localStorage === "undefined") return;
  const list = read();
  const day = today();
  if (list.some((e) => e.t === t && e.id === id && e.day === day)) return;
  localStorage.setItem(KEY, JSON.stringify([...list, { t, id, day }].slice(-500)));
  window.dispatchEvent(new Event("aura-quest"));
}

export const events = () => read();
export const countToday = (t: QuestEventType) => read().filter((e) => e.t === t && e.day === today()).length;
export const uniqueIds = (t: QuestEventType) => [...new Set(read().filter((e) => e.t === t).map((e) => e.id))];
export const stars = () => read().reduce((s, e) => s + POINTS[e.t], 0);
export const level = (s: number) => Math.floor(s / 10) + 1;

/** Title earned with the level. */
export const RANKS = [
  { min: 1, key: "rank.1" },
  { min: 2, key: "rank.2" },
  { min: 3, key: "rank.3" },
  { min: 5, key: "rank.4" },
  { min: 8, key: "rank.5" },
] as const;
export const rankKey = (lv: number) => [...RANKS].reverse().find((r) => lv >= r.min)!.key;

export type Riddle = { id: string; audience: "kids" | "adults"; q: { it: string; en: string }; a: { it: string[]; en: string[] }; ok: number };

// Riddles are authored content (like node texts). Adult trivia is limited to well-known facts about Bra.
export const RIDDLES: Riddle[] = [
  { id: "r1", audience: "kids", q: { it: "Ho tante foglie ma non sono un libro. D'estate faccio ombra, d'inverno resto spoglio. Chi sono?", en: "I have many leaves but I'm not a book. In summer I give shade, in winter I'm bare. What am I?" }, a: { it: ["Un albero", "Una scarpa", "Una nuvola"], en: ["A tree", "A shoe", "A cloud"] }, ok: 0 },
  { id: "r2", audience: "kids", q: { it: "Ho le città ma nessuna casa, ho i fiumi ma nessuna acqua, ho le strade ma nessuno cammina. Cosa sono?", en: "I have cities but no houses, rivers but no water, roads but nobody walks. What am I?" }, a: { it: ["Una mappa", "Un sogno", "Un videogioco"], en: ["A map", "A dream", "A video game"] }, ok: 0 },
  { id: "r11", audience: "kids", q: { it: "Ho un cappello ma non ho la testa, ho un piede ma non ho le scarpe. Cresco nel bosco dopo la pioggia. Chi sono?", en: "I wear a hat but have no head, I have a foot but no shoes. I grow in the woods after rain. What am I?" }, a: { it: ["Un fungo", "Uno gnomo di pietra", "Un ombrello"], en: ["A mushroom", "A stone gnome", "An umbrella"] }, ok: 0 },
  { id: "r12", audience: "kids", q: { it: "Più mi asciughi, più divento bagnato. Che cosa sono?", en: "The more I dry, the wetter I get. What am I?" }, a: { it: ["Un asciugamano", "Una spugna", "Un sasso"], en: ["A towel", "A sponge", "A stone"] }, ok: 0 },
  { id: "r13", audience: "kids", q: { it: "Sale sempre e non scende mai, ogni compleanno ce n'è una in più. Cos'è?", en: "It only goes up and never down, and every birthday there is one more. What is it?" }, a: { it: ["L'età", "Il palloncino", "La torta"], en: ["Age", "The balloon", "The cake"] }, ok: 0 },
  { id: "r14", audience: "kids", q: { it: "Mi trovi in fondo al mare, ma sono anche nel cielo: brillo quando è buio. Chi sono?", en: "You find me at the bottom of the sea, but I'm also in the sky: I shine in the dark. Who am I?" }, a: { it: ["La stella", "La luna piena", "Il pesce lanterna"], en: ["The star", "The full moon", "The lantern fish"] }, ok: 0 },
  { id: "r3", audience: "kids", q: { it: "Più ne togli e più divento grande. Che cosa sono?", en: "The more you take away, the bigger I get. What am I?" }, a: { it: ["Un buco", "Un gelato", "Un palloncino"], en: ["A hole", "An ice cream", "A balloon"] }, ok: 0 },
  { id: "r4", audience: "kids", q: { it: "Sono bianca e fredda, cado dal cielo d'inverno e con me si fanno i pupazzi. Chi sono?", en: "I'm white and cold, I fall from the sky in winter and you build snowmen with me. What am I?" }, a: { it: ["La neve", "La sabbia", "La pioggia calda"], en: ["Snow", "Sand", "Warm rain"] }, ok: 0 },
  { id: "r5", audience: "kids", q: { it: "Ho il collo lunghissimo e mangio le foglie più alte. Chi sono?", en: "I have a very long neck and eat the tallest leaves. Who am I?" }, a: { it: ["La giraffa", "Il topolino", "La tartaruga"], en: ["The giraffe", "The mouse", "The turtle"] }, ok: 0 },
  { id: "r6", audience: "kids", q: { it: "Si rompe appena lo nomini. Che cos'è?", en: "It breaks the moment you say its name. What is it?" }, a: { it: ["Il silenzio", "Il vetro", "L'uovo"], en: ["Silence", "Glass", "An egg"] }, ok: 0 },
  { id: "r7", audience: "kids", q: { it: "Ho i tasti ma non apro nessuna porta. Faccio musica! Chi sono?", en: "I have keys but I open no doors. I make music! What am I?" }, a: { it: ["Il pianoforte", "Il lucchetto", "Il tavolo"], en: ["The piano", "The padlock", "The table"] }, ok: 0 },
  { id: "r8", audience: "kids", q: { it: "Sono rosso e rotondo, sto sulla pizza e nel sugo della pasta. Chi sono?", en: "I'm red and round, I go on pizza and in pasta sauce. What am I?" }, a: { it: ["Il pomodoro", "La mela blu", "Il limone"], en: ["The tomato", "The blue apple", "The lemon"] }, ok: 0 },
  { id: "r9", audience: "kids", q: { it: "Ho un occhio ma non ci vedo. Chi sono?", en: "I have an eye but I cannot see. What am I?" }, a: { it: ["L'ago", "Il gatto", "La finestra"], en: ["The needle", "The cat", "The window"] }, ok: 0 },
  { id: "r10", audience: "kids", q: { it: "Vola senza ali e piange senza occhi. Che cos'è?", en: "It flies without wings and cries without eyes. What is it?" }, a: { it: ["La nuvola", "L'aquilone", "Il pipistrello"], en: ["The cloud", "The kite", "The bat"] }, ok: 0 },
  { id: "a4", audience: "adults", q: { it: "Quale formaggio DOP porta il nome della città di Bra?", en: "Which PDO cheese carries the name of the city of Bra?" }, a: { it: ["Bra", "Castelmagno", "Raschera"], en: ["Bra", "Castelmagno", "Raschera"] }, ok: 0 },
  { id: "a5", audience: "adults", q: { it: "In quale frazione di Bra si trova l'Università di Scienze Gastronomiche?", en: "In which hamlet of Bra is the University of Gastronomic Sciences?" }, a: { it: ["Pollenzo", "Verduno", "Cherasco"], en: ["Pollenzo", "Verduno", "Cherasco"] }, ok: 0 },
  { id: "a1", audience: "adults", q: { it: "Quale movimento dedicato al buon cibo è nato a Bra nel 1986?", en: "Which good-food movement was born in Bra in 1986?" }, a: { it: ["Slow Food", "Fast Food", "Km Zero"], en: ["Slow Food", "Fast Food", "Zero Km"] }, ok: 0 },
  { id: "a2", audience: "adults", q: { it: "In quale provincia piemontese si trova Bra?", en: "In which Piedmont province is Bra?" }, a: { it: ["Cuneo", "Asti", "Novara"], en: ["Cuneo", "Asti", "Novara"] }, ok: 0 },
  { id: "a3", audience: "adults", q: { it: "Quale prodotto è protagonista della biennale «Cheese» a Bra?", en: "Which product stars in Bra's biennial «Cheese» festival?" }, a: { it: ["I formaggi", "I vini", "I tartufi"], en: ["Cheese", "Wine", "Truffles"] }, ok: 0 },
];

/** Today's riddle for a given audience: stable within the day, different from day to day. */
export function riddleOfDay(audience: "kids" | "adults"): Riddle {
  const pool = RIDDLES.filter((r) => r.audience === audience);
  const n = Number(today().replace(/-/g, ""));
  return pool[n % pool.length]!;
}

export function randomRiddle(audience: "kids" | "adults", not?: string): Riddle {
  const pool = RIDDLES.filter((r) => r.audience === audience && r.id !== not);
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export const riddleText = (r: Riddle, lang: Lang) => ({ q: lang === "it" ? r.q.it : r.q.en, a: lang === "it" ? r.a.it : r.a.en });

/** Playful daily challenges (kids and adults). Safe, outdoors, no phone needed: tap "done" when you did it. */
export type Challenge = { id: string; kids: boolean; it: string; en: string };
export const CHALLENGES: Challenge[] = [
  { id: "c1", kids: true, it: "Trova 3 cose di colore verde e dai a ognuna un nome buffo.", en: "Find 3 green things and give each one a funny name." },
  { id: "c2", kids: true, it: "Inventa una filastrocca di 4 versi con la parola «panchina» e dilla a voce alta.", en: "Make up a 4-line rhyme with the word “bench” and say it out loud." },
  { id: "c3", kids: true, it: "Trova un'ombra buffa e inventa che animale è.", en: "Find a funny shadow and decide which animal it is." },
  { id: "c4", kids: true, it: "Cerca nei palazzi una forma di cuore, una di stella e una di cerchio.", en: "Look at the buildings for a heart shape, a star shape and a circle." },
  { id: "c5", kids: true, it: "Scegli una lettera e trova 5 insegne o scritte che iniziano con quella lettera.", en: "Pick a letter and find 5 signs or words starting with it." },
  { id: "c6", kids: true, it: "Conta quanti passi servono per attraversare la piazza (sul marciapiede, guardando dove vai).", en: "Count how many steps it takes to cross the square (on the pavement, watching where you go)." },
  { id: "c7", kids: true, it: "Chiedi a un adulto qual era il suo gioco preferito da bambino e prova a spiegarlo agli amici.", en: "Ask a grown-up what their favourite childhood game was and explain it to your friends." },
  { id: "c8", kids: false, it: "Ordina qualcosa che non hai mai provato in un locale di Bra e racconta com'era.", en: "Order something you have never tried in a venue in Bra and tell how it was." },
  { id: "c9", kids: false, it: "Siediti su una panchina parlante, ascolta un messaggio e lasciane uno tuo per il prossimo.", en: "Sit on a talking bench, listen to a message and leave one of your own for the next person." },
  { id: "c10", kids: false, it: "Fai una passeggiata di 15 minuti senza guardare il telefono e annota 3 dettagli che non avevi mai visto.", en: "Take a 15-minute walk without looking at your phone and note 3 details you had never seen." },
  { id: "c11", kids: false, it: "Entra in una chiesa del centro e guarda in alto: cosa non avevi mai notato?", en: "Step into a church downtown and look up: what had you never noticed?" },
  { id: "c12", kids: true, it: "Fai un sorriso gentile a 3 persone e conta quante te lo restituiscono.", en: "Give a kind smile to 3 people and count how many smile back." },
];

/** Three challenges a day (two for kids, one for grown-ups), different every day. */
export function challengesOfDay(): Challenge[] {
  const n = Number(today().replace(/-/g, ""));
  const kids = CHALLENGES.filter((c) => c.kids);
  const adults = CHALLENGES.filter((c) => !c.kids);
  return [kids[n % kids.length]!, kids[(n * 3 + 1) % kids.length]!, adults[n % adults.length]!].filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i);
}
