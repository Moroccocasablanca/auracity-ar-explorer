# AURACITY — stato del progetto (aggiornato 2026-10-14)

Pilota: Bra. Si lavora SOLO in locale (questa cartella) + GitHub `Moroccocasablanca/auracity-ar-explorer`. Niente Lovable, niente crediti.
Ultimo commit su GitHub: `ce3a590` (senza `.github`). Test: 138 ok. Il telefono NON ha ancora la build nuova.

## Regole dell'utente (non romperle)
- Mai tornare indietro: solo miglioramenti. Gli asset premium (mascotte, avatar, piatti, voci registrate, icone 3D) non si sostituiscono né si peggiorano (`assets.lock.json` + test; aggiungere nuovi con `bun run scripts/assets-lock.mjs`).
- Mai voce robot/telefono. Tre voci: donna (monumenti), commerciante uomo/donna (bar, ristoranti, palestre; uomo di default), giovane curiosa (panchine, alberi, giochi, messaggi dei visitatori). La voce legge SOLO il testo scritto. Le storie dei monumenti si leggono complete.
- Niente chiese/edifici in 3D: accanto alla storia c'è una guida che parla.
- La telecamera chiede sempre il consenso con una frase di sicurezza nella lingua dell'app.
- Chiavi/password mai in chat né nel codice (solo form locale http://localhost:8788, file `~/.auracity-gemini-key`, secret del server).
- L'app deve "camminare con le sue gambe": contenuti AI giornalieri, dati che si aggiornano da soli ("sempre aggiornata, non una volta").
- Mappa pulita e leggera, ma i locali che pagano (bar, ristoranti, gastronomie) si vedono per primi. Colori forti e distinti per categoria + icona 3D su TUTTI i marker. Niente icone/emoji vecchio stile.
- Risposte brevi, in italiano semplice.

## Fatto (tutto su GitHub)
- Mappa: icone 3D in `public/icons3d/` (32 file) dentro marker colorati; `place-style.ts`, `services.ts`, `activities.ts`; legenda con icone 3D; marker che non si sovrappongono (declutter in `BraMap.tsx`); cluster a numero solo sotto zoom 15; servizi in "Tutti" solo da zoom 16.5.
- Categorie nuove: banca, poste, gastronomia, enoteca (57 luoghi OSM in `src/data/services.json`, solo filtro Servizi), monumento comune/castello/memoriale/parco.
- Voce: tolta l'istruzione di stile dal testo inviato a Gemini TTS (`api/tts.ts`, `scripts/genaudio.mjs`); cache v2.
- Farmacia di turno: `src/routes/api/pharmacy-duty.ts` legge da solo il PDF ASL CN2 (due modelli Gemini, solo giorni su cui concordano). UI: filtro "Farmacia di turno" (explore), `DutyCard`, `DutyLine` nella scheda "Oggi a Bra" (`quest.tsx`) e nella Guida, ora live, orario corto, numero di telefono + tasto chiama (richiesta esplicita: il telefono DEVE esserci).

## Da fare subito (quando si riprende)
1. Rifare build e reinstallare sul telefono (`./scripts/serve-prod.sh`, cap sync, installa; il tunnel quick cambia URL, vedi scratchpad `tunnel-url.txt`) e farsi mandare screenshot: mappa pulita, icone 3D, farmacia di turno.
2. **Farmacia di turno — verifiche e lavori aperti**
   - Confrontare il turno estratto (oggi Bainotti, giorno 12:30–15:30 e notte 19:30–08:30) con il cartello su una farmacia o col PDF: finora NON verificato a occhio.
   - Bianchi: due numeri in conflitto (0172 412209 da OSM, 0172 054641 da elenco pubblico): chiamare per scoprire quale è giusto.
   - Carlo Alberto aggiunta a mano (`manual-carlo-alberto`, coordinate da indirizzo piazza Carlo Alberto 30/B): controllare posizione.
   - Farmacie di turno fuori Bra (Sommariva, Roreto…): senza marker, telefono solo se il nome combacia con quelle note: aggiungere i numeri.
   - La notte "di ieri" a volte resta vuota se i due modelli non concordano: valutare un terzo controllo o lettura delle celle a immagine.
   - Mostrare la farmacia di turno in evidenza anche nel filtro "Servizi e sicurezza".
   - Se il PDF ASL cambia impaginazione la lettura può fallire: l'app lo dice e rimanda al calendario; tenerlo d'occhio.
   - Dati telefono presi da farmaciediturno.org (sito privato): meglio fonte ufficiale/OSM a lungo termine.
3. Voce: FATTO 2026-10-18: registrate le 15 storie brevi mancanti + 13 complete dei monumenti (166 test ok, 116 asset protetti). Resta da ASCOLTARE a orecchio (pronuncia doppie, nessuna istruzione letta ad alta voce).
4. Decidere (domanda senza risposta): gastronomie e vinerie anche in "Tutti" come i bar (sono clienti paganti)?

## Da fare più avanti (non ancora iniziato)
- Distacco da Lovable: database Supabase proprio, accesso utenti, hosting proprio (Cloudflare/Vercel/Render: `Dockerfile`, `render.yaml`, `docs/deploy.md` già scritti), togliere il gateway AI Lovable e usare solo `GEMINI_API_KEY`.
- Pagamenti commercianti (Stripe + server condiviso): pagina `/business` ha piani Start 29€ / Pro 59€ solo di esempio, nessun pagamento.
- Notifiche push reali (serve Apple Developer + server).
- Billing su Google AI Studio per voci naturali affidabili (piano gratuito esaurito ogni giorno).
- Cambiare (ruotare) la chiave Gemini che l'utente incollò in chat una volta.
- Permesso GitHub `workflow` per pubblicare `.github/workflows/ci.yml` (deploy continuo); account Render per l'hosting.
- Errore console "document is not defined" non spiegato; prompt nativo dei permessi di movimento può ancora mostrare il nome host; verifica GPS/camera sul telefono reale.
- Altre categorie possibili: panetterie, tabaccherie, parcheggi, bagni pubblici.
- Quiz: materia a scelta, domande scolastiche e vita quotidiana, "Accade oggi" (in parte fatto, da rifinire).

## 2026-11-05 (fatto, NON ancora su GitHub)
- Nuova **Passeggiata guidata** `/tour` (`src/lib/tour.ts`, `src/routes/tour.tsx`, test `src/test/tour.test.ts`): monumenti in ordine a piedi (vicino-più-vicino + 2-opt), km e minuti, storia completa da ascoltare, "Portami lì" a piedi, tappe visitate salvate sul telefono. Ingresso: card in Guida rapida. Testi it/en in `i18n.tsx` (altre lingue: lanciare `scripts/gentranslations.mjs`).
- Guardiano: non riavvia il server durante l'aggiornamento (`/tmp/aura-updating` in `serve-prod.sh`), riavvia il tunnel se l'indirizzo non risponde 3 volte, salva il nuovo indirizzo in `/tmp/tunnel-url`; server avviato dalla sua cartella. Causa dell'app vuota/bianca del 5/11.
- Test 244 ok, tsc ok, build ok. Il lint ha ~11k avvisi solo di formattazione (prettier): da sistemare con `bunx eslint . --fix` in un commit a parte.
- Problema aperto: il tunnel "quick" cambia indirizzo e l'app iPhone (indirizzo fisso dentro) resta vuota → serve hosting con indirizzo fisso (Render/Vercel).
- 2026-11-05 sera: alberi/panchine dicono SEMPRE la frase nuova del giorno (prima solo se la voce era già pronta, altrimenti la vecchia storia registrata con frasi tipo "lontano dai binari"). Voce di riserva gratis edge-tts (`~/Documents/StudioVideo/venv/bin/edge-tts`) in `api/tts.ts` quando Gemini ha finito la quota; stesse 3 voci, salvata in cache .wav; prewarm di tutte le frasi del giorno (80).
- Mappa giorno/notte: palette subito alla lettura dello stile (niente lampo bianco), colore anche per zone residenziali/industriali (niente macchie crema di notte), cambio immediato con nuovi tentativi ogni 120 ms (prima restava mezza scura ~6 s). Verificato a occhio nel browser in entrambe le direzioni.
- Da ascoltare: pronuncia delle doppie con la voce di riserva.
- 2026-11-05 notte: CORRETTO un errore mio: il server salvava cache (farmacie, frasi del giorno, voci) nella cartella servita che si cancella a ogni aggiornamento → ora `DATA_DIR=~/Desktop/drop/auracity` in serve-prod/watchdog.
- Farmacie: un modello Gemini "occupato" (503) bloccava tutto per 1 ora → ora 5 modelli a rotazione con un nuovo tentativo, due letture concordi, riprova dopo 15 min. Novembre letto: oggi Fides (giorno) / Pocapaglia (notte).
- Mappa: vista **satellite reale** (Esri World Imagery, tutto il mondo) sulle colline 3D, predefinita, pulsante satellite accanto a giorno/notte; di notte foto scurita. NB: per uso commerciale serve account gratuito ArcGIS Location Platform (chiave) → da fare prima del lancio pubblico.
- Prossimo: più città (oggi `maxBounds` e `config/bra.ts` bloccano su Bra).
- 2026-11-06: primo passo "più città": mappa sbloccata su Bra + paesi vicini (maxBounds 7.6–8.15 / 44.55–44.82, minZoom 11), raggio fuori-città 20 km. Test 244 ok. Mancano i contenuti (monumenti/locali) dei nuovi paesi.
