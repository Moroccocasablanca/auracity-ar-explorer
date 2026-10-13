# AURACITY — stato del lavoro (13 ottobre 2026)

## Fatto
- Mappa 3D pulita: filtri sopra, pulsanti sotto, etichette che non si sovrappongono, scheda luogo a pannello dal basso.
- "Tu sei qui": avatar a scelta (8 personaggi AI) o foto, colore del contorno, nome; posizione GPS levigata.
- AR: omino di benvenuto davanti a bar e ristoranti (barista, cuoca) con menu 3D e voce.
- Offerte lampo, statistiche del locale, menu 3D, caccia al tesoro settimanale, pagina "Per i locali" con i piani.
- Voci: donna Kore (monumenti), uomo Charon (locali), giovane Puck; `api/tts` le crea e le ricorda.

## Da fare
1. Voce naturale sempre attiva: fatturazione Google AI Studio (pochi centesimi) e registrare le storie rimaste (`bun run scripts/genaudio.mjs`).
2. Staccarsi da Lovable: database Supabase proprio, hosting proprio, togliere il gateway AI Lovable.
3. Abbonamento commercianti vero (Stripe + account locale + server condiviso).
4. Notifiche vere ai clienti (server + account Apple Developer).
5. Dati: testo di San Giovanni Battista, Palazzo Traversa, cinema/teatri/biblioteche, Cherasco.

## Provare sul telefono
Server: `bun run dev` — tunnel: `~/cloudflared-bin/cloudflared tunnel --url http://localhost:5173` —
poi `CAP_SERVER_URL="<indirizzo>/explore" bunx cap sync ios` e reinstallare solo se l'indirizzo è cambiato nella app.
Il Mac deve restare acceso, in carica e con internet.
