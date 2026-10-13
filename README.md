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
| `src/routes/` | Pagine (obbligatoriamente qui): mappa `explore`, AR `index`, avventura `quest`, account `auth`, locali `business` e `node.$slug`, API in `api/` |
| `src/config/` | Impostazioni della città (`bra.ts`: centro, fuso, raggi) e del sistema (`systemConfig.ts`: GDPR, raggio di 50 m, funzioni a pagamento) |
| `src/services/voice/` | Motore voce: Google (`api/tts`), voce del telefono (Web Speech), voce offline (Piper), personaggi vocali |
| `src/services/notifications/` | Avvisi dei locali, preferiti, inviti, notifiche |
| `src/services/ai/`, `translate/`, `mcp/`, `platform/` | Servizi server (moderazione, menu, traduzioni, MCP) e funzioni del telefono (Capacitor) |
| `src/models3d/` | Modelli 3D: monumenti e caricatore di file `.glb` con cache (`loader.ts`) |
| `src/components/ar/` | Vista AR, omino di benvenuto, menu 3D, personaggi parlanti |
| `src/components/map/` | Mappa interattiva |
| `src/components/hunt/` | Caccia al tesoro settimanale e quiz |
| `src/components/admin/` | Pannello del locale (offerte lampo, menu, foto) e strumenti di prova |
| `src/components/account/` | Avatar, lingua, amici, privacy |
| `src/utils/` | Strumenti: geografia e orari (`geo`), cache e throttle (`cache`), risparmio batteria (`power`) |
| `src/lib/` | Logica dei contenuti: quiz, caccia, missioni, locali, testi (`i18n`), posizione |
| `public/` | `audio/` storie registrate, `mascots/` omini, `dishes/` piatti 3D, `avatars/`, voci offline |
| `scripts/` | `serve-prod.sh` (versione veloce per il telefono), `genaudio.mjs` (registra le storie) |

## Voci

- Voce naturale: `src/routes/api/tts.ts` crea la voce con Google (donna Kore, uomo Charon, giovane Puck) e la tiene in memoria.
  Serve la chiave `GEMINI_API_KEY` sul server (in locale: file `~/.auracity-gemini-key`, mai nel codice).
- Storie già registrate: `public/audio/<id-luogo>.m4a` (elenco in `manifest.json`).
- Senza queste, l'app usa la voce gratuita del telefono o quella offline (Piper).

## Regole del progetto

- Si lavora qui e su GitHub; Lovable non serve per modificare.
- Ogni testo nuovo va in `src/lib/i18n.tsx` sia in italiano sia in inglese.
- Nessuna chiave o password nel codice o in chat.
