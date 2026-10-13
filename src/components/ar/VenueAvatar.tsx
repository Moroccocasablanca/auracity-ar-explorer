// The friendly mascot of a venue ("avatar AR del tuo locale"): a modern 3D character (chef for restaurants, barista for the rest).
import type { PlaceStyleKey } from "@/lib/place-style";

export function VenueAvatar({ style, speaking = false, size = 96 }: { style: PlaceStyleKey; speaking?: boolean; size?: number }) {
  return (
    <img
      src={style === "restaurant" ? "/mascots/chef.png" : "/mascots/barista.png"}
      alt=""
      aria-hidden="true"
      style={{ height: size * 1.7, width: "auto" }}
      className={`shrink-0 object-contain drop-shadow-xl ${speaking ? "mascot-talk" : "mascot-idle"}`}
    />
  );
}
