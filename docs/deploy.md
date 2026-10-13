# Aggiornamenti continui (GitHub → telefoni e web)

Idea: l'app per iPhone (cartella `ios/`) è un guscio che **apre il sito**. Quando il sito si aggiorna, si aggiorna anche il telefono, senza reinstallare. Il sito si aggiorna da solo a ogni caricamento su GitHub.

## Cosa è già pronto nel repository
- `.github/workflows/ci.yml`: a ogni push controlla i tipi, esegue i test (compreso il blocco degli asset 3D premium) e prova la build.
- `Dockerfile` e `render.yaml`: dicono al servizio di hosting come costruire e pubblicare l'app.
- `.env.example`: l'elenco dei segreti necessari (i valori veri si mettono solo sull'hosting).

## Cosa deve fare il proprietario, una volta sola (non si può fare dal codice)
1. Aprire un account gratuito su **render.com** e collegarlo a GitHub.
2. *New → Blueprint* e scegliere il repository `auracity-ar-explorer`. Render legge `render.yaml`.
3. Inserire i segreti nel pannello di Render: `GEMINI_API_KEY` e gli altri elencati in `render.yaml`.
4. Render assegna un indirizzo fisso (per esempio `https://auracity.onrender.com`).
5. Ricompilare **una volta** l'app iPhone puntando a quell'indirizzo:
   `CAP_SERVER_URL="https://auracity.onrender.com/explore" bunx cap sync ios` e poi l'installazione da Xcode.
   Da quel momento il tunnel temporaneo non serve più.

## Dopo
- Ogni modifica caricata su `main` → CI → pubblicazione automatica → telefoni e web aggiornati.
- Il piano gratuito si "addormenta" dopo un po' senza visite: il primo accesso può metterci alcuni secondi.
- Le copie su disco delle voci e delle domande (`.voice-cache`, `.daily-cache`) si azzerano a ogni pubblicazione e si rigenerano da sole.

## Limiti da sapere
- Non l'ho potuto provare qui: serve il tuo account Render.
- Il database e l'accesso con Google passano ancora da Lovable Cloud (vedi `docs/stato.md`).
