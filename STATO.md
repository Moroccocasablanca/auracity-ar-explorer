# AURACITY — stato del lavoro

## Fatto (nella copia locale)
Mappa 3D, pin e colori nuovi, personaggi in evidenza, scritte senza sovrapposizioni, via e indirizzi leggibili,
pagina Avventura (indovinelli, missioni, album, passaporto del gusto), scheda ristorante con menu e offerta, storie brevi,
voce dei personaggi più simpatica.

## Novità di oggi
Servizi e sicurezza (farmacie, ospedale, carabinieri, defibrillatori), vista dall'alto, voce da guida, pannello TEST ADMIN.

## Da fare (in ordine)
1. Riportare tutto su Lovable: ricollegare GitHub (lo fa il proprietario) e caricare le modifiche.
2. Voce umana: crediti Lovable, oppure chiave ElevenLabs/OpenAI (segreto del progetto).
3. Scheda luogo con foto che parla + pubblicità per i locali.
4. Foto vere e aggiornate di monumenti e locali.

## Come provarla
Dalla cartella `auracity`: `~/.bun/bin/bun run dev` poi aprire http://localhost:5173/explore

## Prova sul telefono (tunnel temporaneo)
- Programma: ~/cloudflared-bin/cloudflared (Cloudflare, scaricato dal sito ufficiale GitHub)
- Avvio: `~/cloudflared-bin/cloudflared tunnel --url http://localhost:5173` (stampa un indirizzo https://....trycloudflare.com)
- Il Mac deve restare acceso, con internet e con il server dell'app avviato. L'indirizzo cambia a ogni riavvio.
- Le funzioni AI che usano la chiave Lovable (chat guida, traduzioni AI, controllo messaggi, voce AI del server) non funzionano da qui; mappa, voce gratuita, missioni, servizi sì.

## App vera per iPhone (Capacitor) — preparata
- Progetto iOS in `ios/` (già creato). Indirizzo caricato dall'app: variabile `CAP_SERVER_URL` (ora il tunnel temporaneo).
- Permessi già messi: posizione anche a schermo bloccato, fotocamera, bussola.
- Per installare (serve Xcode + iPhone col cavo + ID Apple):
  1. `CAP_SERVER_URL=<indirizzo https> ~/.bun/bin/bunx cap sync ios`
  2. `~/.bun/bin/bunx cap open ios` → in Xcode: Signing & Capabilities → scegli il tuo Team (ID Apple) → scegli l'iPhone → Play.
  3. Sul telefono: Impostazioni → Generali → VPN e gestione dispositivo → fidati dello sviluppatore.
- Con ID Apple gratuito l'app dura 7 giorni.
- Non provato: Xcode non era ancora installato quando è stato scritto.

## Da riprendere domani
1. Voce vera (come quella Kore di Lovable): serve una chiave gratuita di Google AI Studio (aistudio.google.com/apikey).
   La si incolla nella pagina locale http://localhost:8788 (da riavviare: `bun run keyform.mjs` dalla cartella scratchpad, o chiedere a Claude).
   Poi: 3 prove (donna Kore, uomo, giovane) → scegli → registrare tutte le storie una volta e salvarle come file nell'app.
2. L'app sull'iPhone carica l'indirizzo temporaneo del collegamento (cambia se il Mac si riavvia): il Mac deve restare acceso e in carica.
3. Testo di San Giovanni Battista: nessuna fonte trovata, servono i testi della parrocchia o del Comune.
4. Miglioramenti proposti: scheda del luogo a pannello con lettore audio, percorso a piedi sulla mappa, foto vere.
