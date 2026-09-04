import { query, ref, s } from "@xanots/sdk";
import { boardsApi } from "./groups.js";
import { operator } from "../tables/operator.js";
import { leaderboard } from "../tables/leaderboard.js";

/** All leaderboards with status + entry_count (the board picker). */
export const leaderboardsListQuery = query({
  name: "leaderboards_list",
  verb: "GET",
  apiGroup: boardsApi,
  auth: operator,
  stack: [s.db.query({ table: leaderboard, sort: [{ sortBy: "season", dir: "desc" }, { sortBy: "name", dir: "asc" }], as: "rows" })],
  response: { boards: ref("rows") },
});
