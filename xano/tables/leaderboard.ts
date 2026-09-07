import { table, f } from "@xanots/sdk";

/** A ranked board for one season of a game mode. */
export const leaderboard = table({
  name: "leaderboard",
  schema: {
    name: f.text({ required: true }),
    game_mode: f.text({ required: true }),
    season: f.int({ required: true }),
    status: f.enum(["active", "locked", "archived"], { default: "active" }),
    // Denormalized count of entries, kept in step by action_execute.
    entry_count: f.int({ default: 0 }),
  },
});
