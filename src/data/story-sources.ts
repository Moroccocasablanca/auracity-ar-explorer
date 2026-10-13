// Public pages that talk about a monument. They are shown as "sources to check" for texts that have no verified source yet.
const BRA = "https://it.wikipedia.org/wiki/Bra_(Italia)";
const POLLENZO = "https://it.wikipedia.org/wiki/Pollenzo";

export const STORY_SOURCES: Record<string, string[]> = {
  "palazzo-traversa": [BRA],
  "museo-craveri": [BRA],
  "museo-giocattolo": [BRA],
  "chiesa-madonna-angeli": [BRA],
  "chiesa-san-giovanni-battista": [BRA],
  "castello-pollenzo": [POLLENZO],
  "chiesa-san-vittore-pollenzo": [POLLENZO],
};
