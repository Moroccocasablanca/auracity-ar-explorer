import { Camera, Compass, Dumbbell, Heart, Info, Landmark, LocateFixed, MessageCircle, Map as MapIcon, Moon, PartyPopper, Pill, ShieldPlus, ShoppingBag, Sparkles, Star, Sun, TreePine, UserRound, Utensils, Zap, type LucideIcon } from "lucide-react";

/** The pictures of the app: fine line icons with a soft glow in one colour each (calm and modern, not cartoon stickers). */
export type IcoName = "sparkles" | "pill" | "spaghetti" | "classical_building" | "deciduous_tree" | "shopping_bags" | "soccer_ball" | "ambulance" | "high_voltage" | "red_heart" | "world_map" | "camera_with_flash" | "speech_balloon" | "compass" | "smiling_face_with_sunglasses" | "round_pushpin" | "sun" | "crescent_moon" | "information" | "party_popper" | "star";

const ICONS: Record<IcoName, [LucideIcon, string]> = {
  sparkles: [Sparkles, "#a5f3fc"],
  pill: [Pill, "#6ee7b7"],
  spaghetti: [Utensils, "#fdba74"],
  classical_building: [Landmark, "#c4b5fd"],
  deciduous_tree: [TreePine, "#86efac"],
  shopping_bags: [ShoppingBag, "#f9a8d4"],
  soccer_ball: [Dumbbell, "#7dd3fc"],
  ambulance: [ShieldPlus, "#fda4af"],
  high_voltage: [Zap, "#fde047"],
  red_heart: [Heart, "#fb7185"],
  world_map: [MapIcon, "#e0f2fe"],
  camera_with_flash: [Camera, "#e0f2fe"],
  speech_balloon: [MessageCircle, "#e0f2fe"],
  compass: [Compass, "#e0f2fe"],
  smiling_face_with_sunglasses: [UserRound, "#e0f2fe"],
  round_pushpin: [LocateFixed, "#7dd3fc"],
  sun: [Sun, "#fde68a"],
  crescent_moon: [Moon, "#c7d2fe"],
  information: [Info, "#bae6fd"],
  party_popper: [PartyPopper, "#f0abfc"],
  star: [Star, "#fde68a"],
};

export function Ico({ n, className = "size-7" }: { n: IcoName; className?: string }) {
  const [I, color] = ICONS[n];
  return <I aria-hidden strokeWidth={1.7} className={`${className} shrink-0`} style={{ color, filter: `drop-shadow(0 0 5px ${color}66)` }} />;
}
