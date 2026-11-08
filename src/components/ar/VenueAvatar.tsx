// The friendly mascot of a venue ("avatar AR del tuo locale"): a modern 3D character that always matches the voice of the venue (man: barista, woman: chef).
import { TalkingMascot } from "@/components/ar/TalkingMascot";
import type { PlaceStyleKey } from "@/lib/place-style";
import { venueMascot, type VenueVoice } from "@/lib/venue-mascot";

export function VenueAvatar({ voice, speaking = false, size = 96 }: { style?: PlaceStyleKey; voice?: VenueVoice; speaking?: boolean; size?: number }) {
  return (
    <TalkingMascot src={venueMascot(voice)} speaking={speaking} height={size * 1.7} />
  );
}
