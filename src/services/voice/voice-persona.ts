// Voice profiles: who speaks depends on what is speaking.
export enum VoicePersona {
  MONUMENT_FEMALE = "FEMALE_NARRATIVE", // woman's narrating voice for monuments and history
  BUSINESS_USER = "MERCHANT_CHOICE", // man by default, or the voice chosen by the venue
  HUNT_DYNAMIC = "TEEN_PLAYFUL", // young, lively voice for games
}

export type VoiceKind = "female" | "male";

/** Which voice and delivery a profile uses. `venue` is the venue's own choice for BUSINESS_USER. */
export function personaVoice(p: unknown, venue?: VoiceKind): { kind: VoiceKind | null; rate: number; pitchUp: boolean } {
  switch (p) {
    case VoicePersona.MONUMENT_FEMALE:
      return { kind: "female", rate: 0.94, pitchUp: false };
    case VoicePersona.BUSINESS_USER:
      return { kind: venue ?? "male", rate: 1, pitchUp: false }; // bars and restaurants: a man unless the owner picked a woman
    case VoicePersona.HUNT_DYNAMIC:
      return { kind: "female", rate: 1.1, pitchUp: true };
    default:
      return { kind: null, rate: 1, pitchUp: false };
  }
}
