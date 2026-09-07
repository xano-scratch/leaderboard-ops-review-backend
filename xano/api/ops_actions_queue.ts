import { query, input, s, ref, inp, col, cmp, expr } from "@xanots/sdk";
import { opsGroup } from "./groups.js";
import { operator } from "../tables/operator.js";
import { ops_action } from "../tables/ops_action.js";
import { leaderboard } from "../tables/leaderboard.js";
import { entry } from "../tables/entry.js";

/**
 * The review queue: ops_actions joined to their requester and target, newest
 * first, optionally filtered by status. An empty `status` returns every action
 * (the ignoreEmpty filter drops the predicate), so the same endpoint serves the
 * full queue and a single-status view.
 */
export const actionsQueueQuery = query({
  name: "actions_queue",
  verb: "GET",
  apiGroup: opsGroup,
  auth: operator,
  input: {
    status: input.text({ default: "" }),
  },
  stack: [
    s.db.query({
      table: ops_action,
      where: cmp(col("status"), "=", inp("status"), { ignoreEmpty: true }),
      bind: [
        { table: operator, as: "req", join: "left", where: expr(col("requested_by"), "=", col("req.id")) },
        { table: leaderboard, as: "lb", join: "left", where: expr(col("leaderboard_id"), "=", col("lb.id")) },
        { table: entry, as: "ent", join: "left", where: expr(col("entry_id"), "=", col("ent.id")) },
      ],
      eval: [
        { name: "req.name", as: "requester_name" },
        { name: "req.role", as: "requester_role" },
        { name: "lb.name", as: "board_name" },
        { name: "ent.player_handle", as: "entry_handle" },
      ],
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
