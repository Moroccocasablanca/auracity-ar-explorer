import { describe, expect, it } from "vitest";
import { cleanCheck } from "@/lib/clean-text";

const bad = (t: string) => expect(cleanCheck(t).ok, t).toBe(false);
const good = (t: string) => expect(cleanCheck(t).ok, t).toBe(true);

describe("clean text for children", () => {
  it("lets friendly messages through", () => {
    good("Ciao dalla panchina, che bella giornata!");
    good("Una filastrocca: foglia verde, vento piano, chi si siede va lontano!");
    good("Il caffè qui è buonissimo, provate la focaccia calda in centro.");
    good("Perché gli alberi non perdono mai la calma? Perché hanno radici solide!");
    good("I love this garden, the view over the hills is great");
  });
  it("never blocks the innocent words of Bra", () => {
    ["Funghi porcini e tartufo bianco, che bontà!", "Gli gnudi sono buonissimi", "Questo significa che è un posto speciale", "Il Santuario Madonna dei Fiori è in collina", "La nazione italiana ama la pasta", "Una fanciulla raccoglie le mele", "La pubblica piazza è bella", "Il porcellino rosa è simpatico", "Che bel panorama dalla collina, si vede tutto!", "La mortadella e il vino rosso sono ottimi", "Il bambino sale sull'albero con la scala"].forEach(good);
  });
  it("blocks bad words, even disguised", () => {
    ["sei una merda", "che cazzo dici", "vaffanculo", "sei stupido", "m e r d a", "m3rd4", "merrrrda", "STRONZO", "fuck you", "what a bitch", "testa di cazzo", "sei un idiota"].forEach(bad);
  });
  it("blocks phone numbers, links, emails and social networks", () => {
    ["chiamami al 333 123 4567", "3331234567", "+39 333 1234567", "scrivimi su whatsapp", "seguimi su instagram", "www.sito.it", "mario@gmail.com", "il mio numero è tre tre tre uno due tre quattro cinque", "https://qualcosa.com"].forEach(bad);
  });
  it("blocks appointments between strangers", () => {
    ["ci vediamo stasera alle 9", "incontriamoci qui domani", "vieni a casa mia", "meet me tonight at 8", "ti aspetto alle ore 21"].forEach(bad);
  });
  it("blocks violent, sexual, hateful and drug content", () => {
    ["voglio ammazzare qualcuno", "sesso e droga", "porno", "odio gli zingari", "heil hitler", "cocaina"].forEach(bad);
  });
});
