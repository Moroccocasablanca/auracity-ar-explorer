# AURACITY pilot safety and testing pass

## What will change
- Add one central pilot configuration and route every temporary pilot entitlement through it, without changing saved subscriptions.
- Keep automatic admin testing strictly inside local development and Lovable previews; validate the dedicated test account on the server and display a TEST ADMIN badge.
- Complete low-battery behavior for GPS and map animations, preserving the existing camera shutdown behavior.
- Add first-run privacy consent, a bilingual Privacy page, personal-data download and secure account deletion.
- Polish iPhone home-screen behavior with safe areas and a one-time Safari hint.
- Keep existing map icons while enforcing the requested marker palette and legend; show sourced monument history with existing narration.
- Reuse existing 48-hour message filtering, moderation, voices, garden characters, proximity alerts, PWA manifest, friends and venue data rather than rebuild them.

## Technical details
- Server-side checks remain authoritative for admin privileges and pilot venue access; the client configuration controls presentation only.
- Data deletion uses an authenticated server function and removes application-owned data before deleting the authentication account.
- Precise location remains in memory only; no location-history table or tracking cookies are introduced.
- Add focused tests for production admin shutdown, pilot venue entitlements, 48-hour expiry rules and battery preferences.

## Verification
- Run focused tests and inspect current build diagnostics.
- Exercise consent, Account controls, monument narration and map filters in the live preview on desktop and iPhone-sized viewports.
