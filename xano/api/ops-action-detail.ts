import { query, input, inp, ref, col, expr, s, c } from "@xanots/sdk";
import { opsApi } from "./groups.js";
import { operator } from "../tables/operator.js";
import { opsAction } from "../tables/ops-action.js";
import { leaderboard } from "../tables/leaderboard.js";
import { entry } from "../tables/entry.js";
import { approval } from "../tables/approval.js";

/**
 * One ops_action with its requester, its target (board or entry), and its
 * approval rows. The id lives in the PATH — a by-id GET belongs there.
 */
export const actionDetailQuery = query({
  name: "action_detail/{ops_action_id}",
  verb: "GET",
  apiGroup: opsApi,
  auth: operator,
  input: { ops_action_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: opsAction, fieldName: "id", fieldValue: inp("ops_action_id"), as: "action" }),
    s.precondition({
      expr: expr(ref("action", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Action not found."),
    }),
    s.db.get({ table: operator, fieldName: "id", fieldValue: ref("action.requested_by"), output: ["id", "name", "role"], as: "req" }),
    // 0-sentinel FKs bind null on a field-match, so unset targets come back as null.
    s.db.get({ table: leaderboard, fieldName: "id", fieldValue: ref("action.leaderboard_id"), as: "board" }),
    s.db.get({ table: entry, fieldName: "id", fieldValue: ref("action.entry_id"), as: "entryRow" }),
    s.db.query({ table: approval, where: expr(col("ops_action_id"), "=", inp("ops_action_id")), sort: [{ sortBy: "created_at", dir: "asc" }], as: "apprs" }),
  ],
  response: { action: ref("action"), requester: ref("req"), targetBoard: ref("board"), targetEntry: ref("entryRow"), approvals: ref("apprs") },
});
