// Voice profiles: WHO speaks depends only on WHAT is speaking. No general setting overrides them.
//   monuments, streets, services  -> elegant, warm Italian woman
//   bars, restaurants, gyms        -> the merchant's choice (man by default, or the woman if the owner picks her)
//   talking benches, trees, games  -> a young, proud, curious voice
export enum VoicePersona {
  MONUMENT_FEMALE = "FEMALE_NARRATIVE",
  BUSINESS_USER = "MERCHANT_CHOICE",
  HUNT_DYNAMIC = "TEEN_PLAYFUL",
}

export type VoiceKind = "female" | "male" | "young";

/** Which voice a profile uses. `venue` is the merchant's own choice (BUSINESS_USER only). Anything unknown is the young voice. */
export function personaVoice(p: unknown, venue?: "female" | "male"): { kind: VoiceKind } {
  switch (p) {
    case VoicePersona.MONUMENT_FEMALE:
      return { kind: "female" };
    case VoicePersona.BUSINESS_USER:
      return { kind: venue ?? "male" };
    default:
      return { kind: "young" };
  }
}

/** The right profile for a place of the map. */
export function personaForKind(kind: string): VoicePersona {
  if (kind === "business") return VoicePersona.BUSINESS_USER;
  if (kind === "tree" || kind === "bench") return VoicePersona.HUNT_DYNAMIC;
  return VoicePersona.MONUMENT_FEMALE; // monuments, streets, services
}
