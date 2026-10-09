<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## AURACITY architecture
- Public node reads use the browser client; message/review reads use narrow public RPC projections without author names or user IDs, because identity must not leak through direct table reads. Content writes use server functions enforcing presence, hours, receipts and moderation.
- Venue menus refresh automatically via `refreshMenu` (once per Rome day, claimed atomically) reading `nodes.menu_source_url` with AI in `src/lib/menu.server.ts`; owners never upload menus manually.
- Bench messages require a signed-in user (`postBenchMessage` with requireSupabaseAuth). Narration uses AI voices via `naturalVoice` (text loaded server-side from node/message ids, never client text; each clip cached once in the private `voices` bucket + `voice_cache`), falling back to on-device speech.
- Account type (visitor vs business) lives in `public.profiles`, created by the `handle_new_user` trigger; users can only edit `display_name`, so `account_type`/`business_status` changes stay server-side and any future business privileges must check `business_status`, never client data.
- The Bra map uses Leaflet + OpenStreetMap tiles, loaded only in the browser (`React.lazy` behind `<ClientOnly>` in explore), because Leaflet touches `window` at import.
- Proximity alerts run once at the root (`ProximityWatcher`), one alert per place per session, using `nodes.promo_*` as the business invitation text.
- Content moderation lives in `src/lib/moderation.server.ts` (pattern checks + Lovable AI Gateway); it fails closed when the gateway is unavailable.
- Shared geo/opening-hours logic is in `src/lib/geo.ts` and is used by both client and server so rules cannot drift.
- UI strings live in `src/lib/i18n.tsx` (IT/EN source) plus machine-translated `src/lib/locales/*.json` falling back to English; node texts beyond IT/EN are AI-translated once into `node_translations` (keyed by source hash). Never hardcode user-facing text in components.
- GPS/heading state is global in `LocationProvider` (root) so AR, Explore and node pages share one position.
- Map appearance uses SunCalc solar position at Bra with a persisted manual override and a live timer, because device timezone and fixed hours are not reliable daylight indicators.
- Garden interaction eligibility is explicit on nodes and enforced in both shared node rules and a database trigger, because ordinary benches and protected places must not inherit playful messaging privileges.
- Friend identities are returned only by an authenticated RPC after invitation acceptance; public content never returns account identifiers, because mutual consent must precede disclosure.

- AR safety gates live in `ArView`: a confirmation before the camera starts and a pause when GPS speed exceeds walking pace, because players must not use the camera near traffic.

- Public read-only MCP server in `src/lib/mcp/` uses only the anon client and public RPCs, because external assistants may read intentionally public place data but never account data or writes.
- The Bra guide chat (`/guide` + `src/routes/api/guide.ts`) uses Claude via native gateway /v1/messages with read-only anon tools over `nodes`, no stored history, because it must answer from app data without exposing user data.
- Venues carry `nodes.subscribed`; only subscribed venues get prominent pins, proximity alerts, auto-menu reading and reviews (enforced server-side), because those are the paid features. Unsubscribed venues are imported from OpenStreetMap (`osm_id`).
