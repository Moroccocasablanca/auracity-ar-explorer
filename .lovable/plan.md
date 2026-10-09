# AURACITY – Giardini parlanti, voci naturali, più lingue

## Cosa cambia per l'utente

1. **Oggetti parlanti nei giardini (stile Pokémon Go)**
   - Alberi e panchine dei giardini di Bra hanno una faccina (occhi e bocca) che si muove mentre parla.
   - Quando arrivi vicino (entro il raggio GPS), l'oggetto "si sveglia" e legge ad alta voce **l'ultimo messaggio** lasciato. Poi puoi scorrere i precedenti (fino a 10, dal più recente).
   - Sulla mappa gli oggetti parlanti hanno un'icona animata e un contatore "da scoprire / scoperti" (una piccola collezione personale salvata sul telefono).
   - Più punti giardino: Zizzola, giardini di Piazza Caduti, parco della stazione, aiuole davanti alle scuole (solo panchine/alberi, mai edifici).
   - Monumenti, chiese, moschee, case e scuole restano solo informativi, non modificabili.

2. **Messaggi solo divertenti e sicuri**
   - Il filtro blocca: insulti, molestie, numeri di telefono, email, indirizzi, profili social, e **appuntamenti/raduni** ("ci vediamo alle 18", "troviamoci in piazza").
   - Permesso: battute, racconti quotidiani, saluti, inviti generici a mangiare ("venite a provare la pizza!").
   - Messaggio di errore chiaro che spiega perché è stato bloccato.

3. **Voce naturale, non robotica**
   - Voce generata dall'intelligenza artificiale: scelta **Donna** o **Uomo**, che parla nella lingua dell'app (italiano, inglese, e le altre lingue).
   - Ogni testo viene generato una volta e poi riutilizzato (salvato), così il costo resta basso.
   - Se la voce AI non è disponibile, resta la voce del telefono come riserva.

4. **Lingue automatiche dal telefono**
   - Aggiunte: spagnolo, francese, tedesco, arabo (scrittura da destra a sinistra), rumeno, albanese, hindi, oltre a italiano e inglese.
   - L'app sceglie da sola la lingua del telefono; menu per cambiarla a mano.
   - I testi dei monumenti nelle nuove lingue vengono tradotti automaticamente dall'AI e salvati.

5. **Mappa più curata**
   - Stile più leggibile con nomi delle vie chiari, giorno/notte automatico secondo alba e tramonto a Bra (già presente, rifinito), icone distinte per giardini parlanti, monumenti, locali.

## Da decidere / costi
- La voce AI e le traduzioni consumano crediti AI (pochi, perché ogni frase si genera una volta sola).
- I nuovi punti giardino hanno posizioni prese dalla mappa pubblica: da verificare sul posto.

## Dettagli tecnici
- Moderazione: nuova categoria `meetup` nel prompt e regex (orari, "ci vediamo", "troviamoci"), eccezione per inviti a mangiare; nuova chiave d'errore tradotta.
- TTS: server function che chiama il modello di sintesi vocale del gateway con voce femminile/maschile, cache audio in storage (hash di testo+lingua+voce), fallback a `speech.ts`.
- i18n: dizionario esteso a 9 lingue, rilevamento `navigator.languages`, `dir="rtl"` per arabo; tabella `node_translations` (node_id, lang, name, description) riempita al primo accesso via AI.
- Nuovi nodi `tree`/`bench` con `garden_interactive = true` via migrazione; `GardenCharacter` con lettura automatica all'ingresso nel raggio e lista ultimi messaggi; collezione "scoperti" in localStorage.
- Mappa: marker animati per oggetti giardino, rifinitura filtri giorno/notte.
