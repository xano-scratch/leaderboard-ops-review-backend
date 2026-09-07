import { query, input, s, c, ref, inp, auth, col, expr, and, or, obj } from "@xanots/sdk";
import { opsGroup } from "./groups.js";
import { operator } from "../tables/operator.js";
import { ops_action } from "../tables/ops_action.js";
import { approval } from "../tables/approval.js";
import { leaderboard } from "../tables/leaderboard.js";
import { entry } from "../tables/entry.js";
import { roleRank } from "../functions/role_rank.js";
import { writeAudit } from "../functions/write_audit.js";

/**
 * Apply an approved action to game state. This is the last gate, and it is at
 * the API layer: it runs only if the action is `approved`, the caller's role
 * meets the minimum, and (for sensitive types) an approval by a DIFFERENT
 * operator exists. The effect depends on the type: a reset clears a board's
 * entries, a wipe removes one entry, a reward is recorded. Every run appends an
 * `action.executed` row to the audit trail.
 */
export const actionExecuteQuery = query({
  name: "action_execute",
  verb: "POST",
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
    s.precondition({
      expr: expr(ref("action.status"), "=", c.text("approved")),
      error_type: "badrequest",
      error: c.text("Only an approved action can be executed."),
    }),
    // Role guard on the executor.
    s.db.get({ table: operator, fieldValue: auth("id"), output: ["id", "name", "role"], as: "caller" }),
    s.function.run({ fn: roleRank, input: { role: ref("caller.role") }, as: "caller_rr" }),
    s.function.run({ fn: roleRank, input: { role: ref("action.min_approver_role") }, as: "min_rr" }),
    s.conditional({
      when: expr(ref("caller_rr.rank"), "<", ref("min_rr.rank")),
      then: [
        s.function.run({
          fn: writeAudit,
          input: {
            actor_id: auth("id"),
            action: c.text("guard.denied"),
            ops_action_id: ref("action.id"),
            detail_json: obj({ guard: c.text("execute_min_role"), required: ref("action.min_approver_role") }),
            rule_version: ref("action.rule_version"),
          },
        }),
      ],
    }),
    s.precondition({
      expr: expr(ref("caller_rr.rank"), ">=", ref("min_rr.rank")),
      error_type: "accessdenied",
      error: c.text("Your role may not execute this action type."),
    }),
    // Sensitive types need an approval from a DIFFERENT operator than the requester.
    s.db.query({
      table: approval,
      where: [
        expr(col("ops_action_id"), "=", ref("action.id")),
        expr(col("decision"), "=", c.text("approve")),
        expr(col("decided_by"), "!=", ref("action.requested_by")),
      ],
      returnType: "count",
      as: "distinct_approvals",
    }),
    s.conditional({
      when: and(
        expr(ref("action.sensitive"), "=", c.bool(true)),
        expr(ref("distinct_approvals"), "<", c.int(1)),
      ),
      then: [
        s.function.run({
          fn: writeAudit,
          input: {
            actor_id: auth("id"),
            action: c.text("guard.denied"),
            ops_action_id: ref("action.id"),
            detail_json: obj({ guard: c.text("distinct_approver_required") }),
            rule_version: ref("action.rule_version"),
          },
        }),
      ],
    }),
    s.precondition({
      expr: or(
        expr(ref("action.sensitive"), "=", c.bool(false)),
        expr(ref("distinct_approvals"), ">=", c.int(1)),
      ),
      error_type: "accessdenied",
      error: c.text("A sensitive action needs an approval from a different operator before it can run."),
    }),
    // Apply the effect for this action type.
    s.conditional({
      // reset_leaderboard: clear the board's entries and zero its count.
      when: expr(ref("action.type"), "=", c.text("reset_leaderboard")),
      then: [
        s.db.bulk.delete({
          table: entry,
          where: expr(col("leaderboard_id"), "=", ref("action.leaderboard_id")),
          as: "reset_deleted",
        }),
        s.db.edit({
          table: leaderboard,
          fieldValue: ref("action.leaderboard_id"),
          row: { entry_count: c.int(0), status: "active" },
          as: "board_reset",
        }),
      ],
      elif: [
        {
          // wipe_entry: remove the entry, then recompute the board's count.
          when: expr(ref("action.type"), "=", c.text("wipe_entry")),
          then: [
            s.db.get({ table: entry, fieldName: "id", fieldValue: ref("action.entry_id"), as: "target_entry" }),
            s.precondition({
              expr: expr(ref("target_entry", { safe: true }), "!=", c.null()),
              error_type: "badrequest",
              error: c.text("The entry no longer exists."),
            }),
            s.db.del({ table: entry, fieldValue: ref("action.entry_id"), as: "wiped" }),
            s.db.query({
              table: entry,
              where: expr(col("leaderboard_id"), "=", ref("target_entry.leaderboard_id")),
              returnType: "count",
              as: "remaining",
            }),
            s.db.edit({
              table: leaderboard,
              fieldValue: ref("target_entry.leaderboard_id"),
              row: { entry_count: ref("remaining") },
              as: "board_wipe",
            }),
          ],
        },
      ],
      // grant_reward has no dedicated state table; the reward is recorded in the
      // audit trail below (the approved spec defines no rewards table).
    }),
    // Mark it executed and append the execution to the audit trail.
    s.db.edit({ table: ops_action, fieldValue: ref("action.id"), row: { status: "executed" }, as: "executed_action" }),
    s.function.run({
      fn: writeAudit,
      input: {
        actor_id: auth("id"),
        action: c.text("action.executed"),
        ops_action_id: ref("action.id"),
        detail_json: obj({ type: ref("action.type"), payload: ref("action.payload_json") }),
        rule_version: ref("action.rule_version"),
      },
    }),
  ],
  response: ref("executed_action"),
});
