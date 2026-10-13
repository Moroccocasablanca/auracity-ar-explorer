// Everything that is specific to the pilot city lives here, so another town (e.g. Cherasco) is a new file, not a code hunt.
import type { LatLng } from "@/utils/geo";

export const BRA_CENTER: LatLng = { lat: 44.6985, lng: 7.8538 };

export const cityConfig = {
  id: "bra",
  name: "Bra",
  country: "IT",
  timezone: "Europe/Rome",
  center: BRA_CENTER,
  /** Farther than this from the centre, the app switches to demo mode (the visitor is not in town). */
  maxDistanceFromCenterM: 8000,
  /** Discovery radius shown in AR for free visitors. */
  freeRangeM: 250,
} as const;
