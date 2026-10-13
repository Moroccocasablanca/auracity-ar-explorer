// Complete jokes for the talking trees and benches (setup + punchline), so a character never leaves a joke unfinished.
import type { Lang } from "./i18n";
import { romeDate } from "./geo";

type Joke = { q: { it: string; en: string }; a: { it: string; en: string } };

const TREE: Joke[] = [
  { q: { it: "Qual è il colmo per un albero?", en: "What is a tree's biggest problem?" }, a: { it: "Andare a scuola per imparare le radici quadrate!", en: "Going to school to learn square roots!" } },
  { q: { it: "Perché gli alberi non perdono mai la calma?", en: "Why do trees never lose their cool?" }, a: { it: "Perché hanno radici solide!", en: "Because their roots are solid!" } },
  { q: { it: "Come si salutano due alberi?", en: "How do two trees say hello?" }, a: { it: "Con una bella stretta di rami!", en: "With a firm shake of branches!" } },
  { q: { it: "Cosa fa un albero quando ha caldo?", en: "What does a tree do when it is hot?" }, a: { it: "Si mette all'ombra... la sua!", en: "It sits in the shade... its own!" } },
  { q: { it: "Perché un uccellino ha chiesto il Wi-Fi a un albero?", en: "Why did a little bird ask a tree for Wi-Fi?" }, a: { it: "Gli ho risposto: qui abbiamo solo una rete di rami!", en: "I told it: here we only have a network of branches!" } },
  { q: { it: "Che cosa ha detto il vento all'albero?", en: "What did the wind say to the tree?" }, a: { it: "Non ti preoccupare, ti faccio solo un po' di solletico!", en: "Don't worry, I'm only tickling you a little!" } },
];

const BENCH: Joke[] = [
  { q: { it: "Qual è il colmo per una panchina?", en: "What is a bench's biggest problem?" }, a: { it: "Avere sempre qualcuno che ti sta addosso!", en: "Always having someone sitting on you!" } },
  { q: { it: "Che sport fa una panchina?", en: "What sport does a bench play?" }, a: { it: "Sollevamento persone, ma soltanto da sedute!", en: "Weightlifting people, but only when they are sitting!" } },
  { q: { it: "Perché la panchina è la migliore amica dei nonni?", en: "Why is the bench grandparents' best friend?" }, a: { it: "Perché ascolta tutte le storie senza mai alzarsi!", en: "Because it listens to every story without ever getting up!" } },
  { q: { it: "Che cosa fa una panchina quando piove?", en: "What does a bench do when it rains?" }, a: { it: "Si fa la doccia senza nemmeno alzarsi!", en: "It takes a shower without even getting up!" } },
  { q: { it: "Perché i treni viaggiano e la panchina no?", en: "Why do trains travel and the bench doesn't?" }, a: { it: "Perché io il mio biglietto lo tengo sempre seduto!", en: "Because I always keep my ticket sitting down!" } },
];

/** Sample messages shown only in test mode, to preview how the feed looks when people have written for the next person. */
export const DEMO_MESSAGES: { it: string; en: string }[] = [
  { it: "Se vi fermate qui al tramonto, la vista sulle colline è la più bella di Bra. Fidatevi!", en: "Stop here at sunset: the view over the hills is the best in Bra. Trust me!" },
  { it: "Perché la panchina non fa mai tardi? Perché è sempre già seduta! Buona giornata a chi legge.", en: "Why is the bench never late? It is always already seated! Have a nice day, reader." },
  { it: "Consiglio per chi ha fame: provate la focaccia calda appena sfornata in centro, vale la camminata.", en: "Tip if you are hungry: try the warm focaccia fresh from the oven downtown. Worth the walk." },
  { it: "Oggi ho portato mia nonna a riposare qui. Ci ha raccontato di quando era bambina. Fermatevi ad ascoltare i nonni.", en: "Today I brought my grandmother to rest here. She told us about when she was a child. Stop and listen to grandparents." },
  { it: "Filastrocca: foglia verde, vento piano, chi si siede va lontano!", en: "Little rhyme: green leaf, gentle breeze, whoever sits here travels far!" },
  { it: "Ho finito il turno e questo è il posto più tranquillo per un caffè. Buon pomeriggio a tutti!", en: "Shift is over and this is the quietest spot for a coffee. Good afternoon everyone!" },
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** One complete joke per character per day (the next day brings a new one). */
export function jokeFor(kind: string, nodeId: string, lang: Lang) {
  const pool = kind === "tree" ? TREE : BENCH;
  const j = pool[hash(`${nodeId}${romeDate(new Date())}`) % pool.length]!;
  const it = lang === "it";
  return { q: it ? j.q.it : j.q.en, a: it ? j.a.it : j.a.en };
}

/** Some stored texts contain placeholders such as "da None": drop them. */
export const cleanText = (s: string | null | undefined) => (s ?? "").replace(/\s+(da|di|a)\s+None\b/gi, "").replace(/\bNone\b/g, "").replace(/\\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
