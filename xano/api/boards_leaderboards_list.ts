import { query, s, ref } from "@xanots/sdk";
import { boardsGroup } from "./groups.js";
import { operator } from "../tables/operator.js";
import { leaderboard } from "../tables/leaderboard.js";

/** All boards with their status and entry_count. Feeds the board picker. */
export const leaderboardsListQuery = query({
  name: "leaderboards_list",
  verb: "GET",
  apiGroup: boardsGroup,
  auth: operator,
  stack: [
    s.db.query({
      table: leaderboard,
      sort: [{ sortBy: "season", dir: "desc" }, { sortBy: "name", dir: "asc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
