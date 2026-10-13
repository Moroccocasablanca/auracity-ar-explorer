import { defineMcp } from "@lovable.dev/mcp-js";
import listPlaces from "@/services/mcp/tools/list-places";
import getPlace from "@/services/mcp/tools/get-place";
import latestMessages from "@/services/mcp/tools/latest-messages";

export default defineMcp({
  name: "my-daily-companion",
  title: "My Daily Companion",
  version: "0.1.0",
  instructions:
    "Read-only tools for AURACITY in Bra, Italy: find places (monuments, venues, talking garden benches and trees), read their history and invitations, and hear the latest anonymous messages. Posting is only possible in person in the app.",
  tools: [listPlaces, getPlace, latestMessages],
});
