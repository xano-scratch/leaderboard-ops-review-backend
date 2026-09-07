import { query, input, s, ref, inp, col, expr } from "@xanots/sdk";
import { boardsGroup } from "./groups.js";
import { operator } from "../tables/operator.js";
import { entry } from "../tables/entry.js";

/** Entries for one board, ranked, showing the cheat flag. Feeds the entry picker. */
export const entriesListQuery = query({
  name: "entries_list",
  verb: "GET",
  apiGroup: boardsGroup,
  auth: operator,
  input: { leaderboard_id: input.int({ required: true }) },
  stack: [
    s.db.query({
      table: entry,
      where: expr(col("leaderboard_id"), "=", inp("leaderboard_id")),
      sort: [{ sortBy: "rank", dir: "asc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
