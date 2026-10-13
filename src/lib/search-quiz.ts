// "Caccia alla risposta": questions that need a search on the internet. Answers are typed; numbers accept a small margin.
export type SearchQ = { id: string; q: { it: string; en: string }; answer: string; tolerance?: number; hint?: { it: string; en: string } };

export const SEARCH_QUESTIONS: SearchQ[] = [
  { id: "s1", q: { it: "Quanto è alto il Monviso, la montagna che si vede da Bra? (in metri)", en: "How tall is Monviso, the mountain you can see from Bra? (in metres)" }, answer: "3841", tolerance: 15 },
  { id: "s2", q: { it: "In che anno è stato inaugurato il traforo del Monte Bianco?", en: "In which year was the Mont Blanc Tunnel opened?" }, answer: "1965" },
  { id: "s3", q: { it: "In che anno Tim Berners-Lee propose il World Wide Web?", en: "In which year did Tim Berners-Lee propose the World Wide Web?" }, answer: "1989" },
  { id: "s4", q: { it: "Che frase conteneva il primo SMS della storia, inviato nel 1992?", en: "What did the very first SMS, sent in 1992, say?" }, answer: "merry christmas", hint: { it: "Due parole, in inglese.", en: "Two words." } },
  { id: "s5", q: { it: "Quanti anni è durata la Guerra dei Cent'anni?", en: "How many years did the Hundred Years' War actually last?" }, answer: "116", tolerance: 0 },
  { id: "s6", q: { it: "Quante ossa ha il corpo di un adulto?", en: "How many bones does an adult human body have?" }, answer: "206", tolerance: 0 },
  { id: "s7", q: { it: "Quanti cuori ha un polpo?", en: "How many hearts does an octopus have?" }, answer: "3", tolerance: 0 },
  { id: "s8", q: { it: "Quanto è profonda, circa, la Fossa delle Marianne? (in chilometri)", en: "Roughly how deep is the Mariana Trench? (in kilometres)" }, answer: "10.9", tolerance: 0.6 },
  { id: "s9", q: { it: "In che anno è stata fondata Wikipedia?", en: "In which year was Wikipedia founded?" }, answer: "2001" },
  { id: "s10", q: { it: "In che anno è stato presentato il primo iPhone?", en: "In which year was the first iPhone presented?" }, answer: "2007" },
  { id: "s11", q: { it: "Quante stelle ha la bandiera dell'Unione Europea?", en: "How many stars are on the flag of the European Union?" }, answer: "12", tolerance: 0 },
  { id: "s12", q: { it: "Quanti minuti impiega la luce del Sole ad arrivare sulla Terra? (arrotonda all'intero)", en: "How many minutes does sunlight take to reach Earth? (round to a whole number)" }, answer: "8", tolerance: 0 },
  { id: "s13", q: { it: "Qual è la capitale dell'Australia?", en: "What is the capital of Australia?" }, answer: "canberra" },
  { id: "s14", q: { it: "In che anno è stata fondata Google?", en: "In which year was Google founded?" }, answer: "1998" },
  { id: "s15", q: { it: "Chi era il primo programmatore della storia, figlia di Lord Byron? (nome e cognome)", en: "Who is considered the first programmer in history, daughter of Lord Byron? (full name)" }, answer: "ada lovelace" },
  { id: "s16", q: { it: "Quanti Stati membri ha l'ONU?", en: "How many member states does the United Nations have?" }, answer: "193", tolerance: 0 },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9., ]/g, "").trim();

export function checkAnswer(q: SearchQ, input: string): boolean {
  const n = norm(input);
  if (!n) return false;
  const want = Number(q.answer.replace(",", "."));
  if (!Number.isNaN(want)) {
    const got = Number(n.replace(/\s/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    return !Number.isNaN(got) && Math.abs(got - want) <= (q.tolerance ?? 0);
  }
  return n === q.answer || n.includes(q.answer);
}

/** Three search questions a day, different every day. */
export function searchQuestionsOfDay(day: number): SearchQ[] {
  const n = SEARCH_QUESTIONS.length;
  return [0, 5, 11].map((k) => SEARCH_QUESTIONS[(day * 3 + k) % n]!).filter((q, i, a) => a.findIndex((x) => x.id === q.id) === i);
}
