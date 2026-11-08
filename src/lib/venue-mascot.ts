// The mascot of a bar or restaurant ALWAYS matches the voice that speaks for it: a man never moves his lips with a woman's voice, and the other way round.
// (We have a barista man and a chef woman. A restaurant with the default man's voice therefore shows the man until a male chef picture exists.)
export type VenueVoice = "female" | "male" | undefined;
export const venueMascot = (voice: VenueVoice): string => (voice === "female" ? "/mascots/chef.webp" : "/mascots/barista.webp");
