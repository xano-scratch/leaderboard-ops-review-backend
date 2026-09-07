import { query, input, s, c, ref, inp, col, expr } from "@xanots/sdk";
import { opsGroup } from "./groups.js";
import { operator } from "../tables/operator.js";
import { ops_action } from "../tables/ops_action.js";
import { leaderboard } from "../tables/leaderboard.js";
import { entry } from "../tables/entry.js";
import { approval } from "../tables/approval.js";

/**
 * One ops_action with its requester, its target (board or entry), and every
 * approval row against it, oldest first. Feeds the detail pane of the review
 * queue. The id rides the path so the route is addressable.
 */
export const actionDetailQuery = query({
  name: "action_detail/{ops_action_id}",
  verb: "GET",
  apiGroup: opsGroup,
  auth: operator,
  input: { ops_action_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: ops_action, fieldValue: inp("ops_action_id"), as: "action" }),
    s.precondition({
      expr: expr(ref("action", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Action not found."),
    }),
    s.db.get({
      table: operator,
      fieldValue: ref("action.requested_by"),
      output: ["id", "name", "role", "email"],
      as: "requester",
    }),
    // Targets are optional foreign keys; a 0 sentinel binds null through the field match.
    s.db.get({ table: leaderboard, fieldName: "id", fieldValue: ref("action.leaderboard_id"), as: "board" }),
    s.db.get({ table: entry, fieldName: "id", fieldValue: ref("action.entry_id"), as: "entry_row" }),
    s.db.query({
      table: approval,
      where: expr(col("ops_action_id"), "=", ref("action.id")),
      sort: [{ sortBy: "created_at", dir: "asc" }],
      as: "approvals",
    }),
  ],
  response: {
    action: ref("action"),
    requester: ref("requester"),
    board: ref("board"),
    entry: ref("entry_row"),
    approvals: ref("approvals"),
  },
});
