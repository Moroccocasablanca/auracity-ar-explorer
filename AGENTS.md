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
- Public reads (nodes, messages, reviews) go through the browser Supabase client with anon SELECT policies; all writes go through `src/lib/auracity.functions.ts` server functions using supabaseAdmin, because presence, opening hours, receipts and moderation must be enforced server-side.
- Venue menus refresh automatically via `refreshMenu` (once per Rome day, claimed atomically) reading `nodes.menu_source_url` with AI in `src/lib/menu.server.ts`; owners never upload menus manually.
- Bench messages require a signed-in user (`postBenchMessage` with requireSupabaseAuth); audio playback uses on-device speech (`src/lib/speech.ts`) to avoid per-listen AI cost.
- Content moderation lives in `src/lib/moderation.server.ts` (pattern checks + Lovable AI Gateway); it fails closed when the gateway is unavailable.
- Shared geo/opening-hours logic is in `src/lib/geo.ts` and is used by both client and server so rules cannot drift.
- UI strings live in the dictionary in `src/lib/i18n.tsx` (IT/EN); never hardcode user-facing text in components.
- GPS/heading state is global in `LocationProvider` (root) so AR, Explore and node pages share one position.
