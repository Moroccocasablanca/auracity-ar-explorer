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

Tre voci, ognuna per il suo ruolo (nessuna impostazione generale le cambia): `src/services/voice/voice-persona.ts`.
- **Monumenti, vie, servizi:** donna elegante (Kore).
- **Bar, ristoranti, palestre:** la scelta del locale, l'uomo (Charon) se non ha scelto.
- **Panchine e alberi parlanti, giochi, messaggi dei visitatori:** voce giovane e curiosa (Puck).

Come parlano, in ordine: 1) storia **registrata** (`public/audio/<id>.m4a` breve, `<id>-full.m4a` completa), istantanea e offline;
2) voce naturale del server (`src/routes/api/tts.ts`, Google, in 9 lingue, a pezzi senza pause); 3) solo se tutto manca, la voce del telefono.
Chiave: `GEMINI_API_KEY` sul server (in locale `~/.auracity-gemini-key`, mai nel codice).
Registrare le storie mancanti: `bun run scripts/genaudio.mjs` (brevi) e `bun run scripts/genaudio.mjs --full` (storie complete dei monumenti); gira più modelli Google a rotazione e riprende dove si è fermato.

## Regole del progetto

- Si lavora qui e su GitHub; Lovable non serve per modificare.
- Ogni testo nuovo va in `src/lib/i18n.tsx` sia in italiano sia in inglese.
- Nessuna chiave o password nel codice o in chat.
- **Regola assoluta:** gli asset 3D premium (omini, avatar, piatti, voci registrate) non si sostituiscono né si peggiorano. Sono protetti da `assets.lock.json` e dal test `src/test/assets-lock.test.ts`: se un file cambia o sparisce, i test falliscono. Per aggiungerne di nuovi: `bun run scripts/assets-lock.mjs` (aggiunge, non sovrascrive).
- Contenuti AI (offerte lampo, indovinelli, domande del giorno) hanno sempre un'alternativa pronta se l'AI è occupata: l'app non si blocca mai.
