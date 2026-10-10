import { describe, expect, it } from "vitest";
import { explorePriority, matchesExploreFilter, isRestaurant } from "@/lib/explore-rules";

const place = (kind: string, venue_type: string | null = null, subscribed = false, garden_interactive = false) => ({ kind, venue_type, subscribed, garden_interactive });
describe("Bra exploration priorities", () => {
  it("excludes street points even from all places", () => expect(matchesExploreFilter(place("street"), "all")).toBe(false));
  it("shows restaurants separately from bars", () => {
    expect(matchesExploreFilter(place("business", "restaurant"), "restaurants")).toBe(true);
    expect(matchesExploreFilter(place("business", "bar"), "restaurants")).toBe(false);
  });
  it("keeps bars visible among all venues", () => expect(matchesExploreFilter(place("business", "cafe"), "all")).toBe(true));
  it("prioritizes restaurants over cafes", () => expect(explorePriority(place("business", "restaurant"))).toBeLessThan(explorePriority(place("business", "cafe"))));
  it("keeps subscribed venues first", () => expect(explorePriority(place("business", "cafe", true))).toBe(0));
  it("only offers playful garden spots, not ordinary station furniture", () => {
    expect(matchesExploreFilter(place("bench", null, false, true), "gardens")).toBe(true);
    expect(matchesExploreFilter(place("bench"), "gardens")).toBe(false);
  });
  it("includes casual places to eat", () => expect(isRestaurant(place("business", "fast_food"))).toBe(true));
});