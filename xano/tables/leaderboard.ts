import { table, f } from "@xanots/sdk";

/** A ranked board for one season of a game mode. */
export const leaderboard = table({
  name: "leaderboard",
  schema: {
    name: f.text({ required: true }),
    game_mode: f.text({ required: true }),
    season: f.int({ required: true, default: 1 }),
    status: f.enum(["active", "locked", "archived"], { required: true, default: "active" }),
    // Denormalized for display; recomputed from real rows when an action executes.
    entry_count: f.int({ default: 0 }),
  },
});
