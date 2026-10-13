# AURACITY — Bra

App di città in realtà aumentata per Bra (Piemonte): mappa 3D con ristoranti, bar, monumenti, giardini parlanti,
servizi; giochi per bambini e adulti; omini di benvenuto davanti ai locali con menu e offerte lampo; voci narranti.

## Avvio rapido

```sh
bun install
bun run dev          # http://localhost:5173
```

Prova sul telefono (tunnel temporaneo): vedi `docs/stato.md`. App iPhone (Capacitor): cartella `ios/`.

## Struttura

| Cartella | Contenuto |
|---|---|
| `src/routes/` | Pagine: mappa (`explore`), AR (`index`), avventura (`quest`), account (`auth`), locali (`business`, `node.$slug`), API (`api/`) |
| `src/components/` | Schermate e pezzi di interfaccia: mappa (`BraMap`), AR (`ArView`), omino (`VenueGreeter`), avatar, pannelli admin/test |
| `src/lib/` | Logica: posizione (`location`), voce (`speech`, `neuralVoice`, `voice.functions`), contenuti dei locali (`venue-content`, `merchant`), caccia al tesoro (`hunt`), testi (`i18n`) |
| `src/data/` | Dati fissi: servizi, attività, modelli dei monumenti |
| `public/` | File pubblici: `audio/` (storie registrate), `mascots/` (omini), `avatars/`, voci offline (`piper/`, `ort/`) |
| `scripts/` | Programmi di servizio (es. `genaudio.mjs` registra le storie con la voce Google) |
| `supabase/`, `drizzle/` | Database e sue regole |
| `ios/` | App iPhone (Capacitor) |
| `docs/` | Stato del lavoro e roadmap |

## Voci

- Voce naturale: `src/routes/api/tts.ts` crea la voce con Google (donna Kore, uomo Charon, giovane Puck) e la tiene in memoria.
  Serve la chiave `GEMINI_API_KEY` sul server (in locale: file `~/.auracity-gemini-key`, mai nel codice).
- Storie già registrate: `public/audio/<id-luogo>.m4a` (elenco in `manifest.json`).
- Senza queste, l'app usa la voce gratuita del telefono o quella offline (Piper).

## Regole del progetto

- Si lavora qui e su GitHub; Lovable non serve per modificare.
- Ogni testo nuovo va in `src/lib/i18n.tsx` sia in italiano sia in inglese.
- Nessuna chiave o password nel codice o in chat.
