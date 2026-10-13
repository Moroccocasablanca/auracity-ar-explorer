// The friendly mascot of a venue ("avatar AR del tuo locale"): a modern 3D character (chef for restaurants, barista for the rest).
import { TalkingMascot } from "@/components/ar/TalkingMascot";
import type { PlaceStyleKey } from "@/lib/place-style";

export function VenueAvatar({ style, speaking = false, size = 96 }: { style: PlaceStyleKey; speaking?: boolean; size?: number }) {
  return (
    <TalkingMascot src={style === "restaurant" ? "/mascots/chef.png" : "/mascots/barista.png"} speaking={speaking} height={size * 1.7} />
  );
}
