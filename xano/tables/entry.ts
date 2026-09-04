import { table, f } from "@xanots/sdk";
import { leaderboard } from "./leaderboard.js";

/** One player's standing on a board. Many entries per leaderboard. */
export const entry = table({
  name: "entry",
  schema: {
    leaderboard_id: f.tableRef(leaderboard, { required: true }),
    player_handle: f.text({ required: true }),
    score: f.int({ default: 0 }),
    rank: f.int({ default: 0 }),
    flagged_cheat: f.bool({ default: false }),
  },
  index: [{ type: "btree", fields: [{ name: "leaderboard_id" }] }],
});
