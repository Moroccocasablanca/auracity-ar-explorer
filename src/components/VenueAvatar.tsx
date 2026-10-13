// The friendly mascot of a venue ("avatar AR del tuo locale"): a chef for restaurants, a barista for cafés, and so on.
import type { PlaceStyleKey } from "@/lib/place-style";

const HAT: Record<PlaceStyleKey, string> = {
  restaurant: '<path d="M28 40c-9-1-12-14-3-18 2-9 14-11 20-5 6-6 18-4 20 5 9 4 6 17-3 18v6H28v-6Z" fill="#fff" stroke="#e5e7eb" stroke-width="2"/>',
  cafe: '<path d="M26 42c0-12 11-18 24-18s24 6 24 18Z" fill="#92400e"/><rect x="24" y="40" width="52" height="7" rx="3" fill="#78350f"/><circle cx="50" cy="26" r="5" fill="#fff"/>',
  streetfood: '<path d="M22 44 50 14l28 30c-8 4-20 6-28 6s-20-2-28-6Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/><circle cx="42" cy="34" r="4" fill="#dc2626"/><circle cx="58" cy="38" r="4" fill="#dc2626"/><circle cx="50" cy="26" r="3.5" fill="#dc2626"/>',
  icecream: '<circle cx="38" cy="32" r="12" fill="#f9a8d4"/><circle cx="62" cy="32" r="12" fill="#fde68a"/><circle cx="50" cy="24" r="12" fill="#fff"/><path d="M30 42h40l-8 8H38Z" fill="#d97706"/>',
  bar: '<path d="M30 18h40l-6 20a14 14 0 0 1-28 0Z" fill="#fbcfe8" stroke="#be185d" stroke-width="2"/><circle cx="62" cy="18" r="7" fill="#dc2626"/><path d="M62 11c3-3 7-3 9-1" stroke="#16a34a" stroke-width="3" fill="none"/>',
  shop: '<path d="M26 42c0-12 11-20 24-20s24 8 24 20Z" fill="#0ea5e9"/>',
  church: "",
  palace: "",
  museum: "",
};

const BODY: Record<PlaceStyleKey, string> = {
  restaurant: "#fff",
  cafe: "#92400e",
  streetfood: "#ef4444",
  icecream: "#ec4899",
  bar: "#be185d",
  shop: "#0ea5e9",
  church: "#7c3aed",
  palace: "#b7791f",
  museum: "#0e7490",
};

export function VenueAvatar({ style, speaking = false, size = 96 }: { style: PlaceStyleKey; speaking?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-hidden="true" className={speaking ? "venue-avatar is-speaking" : "venue-avatar"}>
      <ellipse cx="50" cy="95" rx="26" ry="4" fill="#0006" />
      <path d="M22 96c0-16 12-24 28-24s28 8 28 24Z" fill={BODY[style]} stroke="#0002" strokeWidth="1.5" />
      <circle cx="50" cy="56" r="21" fill="#fcd9b6" stroke="#e8b98d" strokeWidth="1.5" />
      <g dangerouslySetInnerHTML={{ __html: HAT[style] }} />
      <circle cx="42" cy="54" r="2.8" fill="#1f2937" className="venue-eye" />
      <circle cx="58" cy="54" r="2.8" fill="#1f2937" className="venue-eye" />
      <circle cx="37" cy="61" r="3.5" fill="#fca5a5" opacity=".7" />
      <circle cx="63" cy="61" r="3.5" fill="#fca5a5" opacity=".7" />
      <path d="M43 64q7 6 14 0" stroke="#7f1d1d" strokeWidth="2.4" fill="none" strokeLinecap="round" className="venue-mouth" />
    </svg>
  );
}
