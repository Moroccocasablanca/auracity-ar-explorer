# Verifica automatica dei locali (nessuno controlla a mano)

Chi si registra come titolare di un bar/ristorante resta "in prova" (niente offerte, niente pagamenti) finché la verifica non dice "approvato".

## Già pronto (codice + test)
- `src/lib/business-verification.ts`: unisce i segnali in UNA decisione (`approved` / `needs_more` / `rejected`) con i motivi e cosa manca.
- `src/lib/business-verification.server.ts`: controllo della partita IVA nel registro UE (VIES, gratuito: dà anche nome e indirizzo) e lettura della foto dell'insegna con Gemini.
- `src/test/business-verification.test.ts`: regole provate (mai approvato senza il codice al telefono del locale, ecc.).

## Segnali e peso
| Segnale | Punti |
|---|---|
| Email confermata (obbligatoria) | 10 |
| Email sul dominio del locale | +10 |
| Codice ricevuto sul telefono pubblico del locale | 40 (obbligatorio se il locale ha un telefono) |
| Presente sul posto, entro 40 m (oltre 150 m = rifiutato) | 15 |
| Partita IVA valida e intestata al locale (nome o indirizzo) | 20 (non valida = rifiutato) |
| Foto dal vivo dell'insegna/menu con il nome giusto | 15 |
Approvato da 70 punti, solo se c'è la prova forte (codice al telefono; oppure, senza telefono pubblico, IVA + foto dal vivo + presenza insieme).

## Manca per accenderla (servizi esterni e database)
1. **Database proprio**: tabella `venue_claims` (utente, locale, segnali, decisione, data) e `profiles.business_status` che passa a `active` solo dal server.
2. **Invio del codice al telefono del locale** (chiamata/SMS): serve un fornitore (es. Twilio), circa 5-10 centesimi a codice.
3. **Invio email di conferma**: oggi la gestisce Supabase Auth del progetto Lovable; con il database proprio va riconfigurata.
4. **Schermata "Questo è il mio locale"** (passi: email, codice, posizione, partita IVA, foto) che chiama il server; la decisione si calcola SOLO sul server dai segnali salvati, mai da dati inviati dal telefono.
5. Dopo l'approvazione: un solo proprietario per locale; un'altra richiesta avvisa il titolare; con più segnalazioni la verifica riparte.
