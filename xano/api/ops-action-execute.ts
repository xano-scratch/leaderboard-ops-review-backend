import { query, input, inp, ref, auth, col, expr, obj, s, c } from "@xanots/sdk";
import { opsApi } from "./groups.js";
import { operator } from "../tables/operator.js";
import { opsAction } from "../tables/ops-action.js";
import { leaderboard } from "../tables/leaderboard.js";
import { entry } from "../tables/entry.js";
import { approval } from "../tables/approval.js";
import { resolveRule } from "../functions/resolve-rule.js";
import { roleRank } from "../functions/role-rank.js";
import { writeAudit } from "../functions/write-audit.js";

/**
 * Apply an approved action to game state. Blocked at the API layer unless the
 * status is `approved`, the caller meets the type's minimum role, and (for a
 * sensitive type) an approval by a DISTINCT operator exists.
 */
export const actionExecuteQuery = query({
  name: "action_execute",
  verb: "POST",
  apiGroup: opsApi,
  auth: operator,
  input: { ops_action_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: opsAction, fieldName: "id", fieldValue: inp("ops_action_id"), as: "action" }),
    s.precondition({ expr: expr(ref("action", { safe: true }), "!=", c.null()), error_type: "notfound", error: c.text("Action not found.") }),
    s.precondition({ expr: expr(ref("action.status"), "=", c.text("approved")), error_type: "badrequest", error: c.text("Only an approved action can be executed.") }),
    s.db.get({ table: operator, fieldName: "id", fieldValue: auth("id"), output: ["id", "name", "role"], as: "me" }),
    s.function.run({ fn: resolveRule, input: { action_type: ref("action.type") }, as: "rule" }),
    s.function.run({ fn: roleRank, input: { role: ref("me.role") }, as: "callerRank" }),
    s.function.run({ fn: roleRank, input: { role: ref("rule.min_role") }, as: "needRank" }),

    // Role guard on execute too.
    s.conditional({
      when: expr(ref("callerRank.rank"), "<", ref("needRank.rank")),
      then: [
        s.function.run({
          fn: writeAudit,
          input: {
            actor_id: auth("id"),
            action: c.text("guard.denied"),
            ops_action_id: inp("ops_action_id"),
            detail: obj({ guard: c.text("role_below_required"), phase: c.text("execute"), required: ref("rule.min_role"), caller: ref("me.role") }),
            rule_version: ref("rule.version"),
          },
        }),
      ],
    }),
    s.precondition({
      expr: expr(ref("callerRank.rank"), ">=", ref("needRank.rank")),
      error_type: "accessdenied",
      error: c.text("Your role is below the required role to execute this action."),
    }),

    // Sensitive types need an approval by an operator OTHER than the requester.
    s.conditional({
      when: expr(ref("rule.sensitive"), "=", c.bool(true)),
      then: [
        s.db.query({
          table: approval,
          where: [
            expr(col("ops_action_id"), "=", inp("ops_action_id")),
            expr(col("decision"), "=", c.text("approve")),
            expr(col("decided_by"), "!=", ref("action.requested_by")),
          ],
          returnType: "count",
          as: "distinctApprovals",
        }),
        s.precondition({
          expr: expr(ref("distinctApprovals"), ">=", c.int(1)),
          error_type: "accessdenied",
          error: c.text("A sensitive action needs an approval by a distinct second operator before it can run."),
        }),
      ],
    }),

    // Apply the effect by type.
    s.set_var("effect", c.text("")),
    s.switch({
      on: ref("action.type"),
      cases: [
        {
          when: c.text("reset_leaderboard"),
          body: [
            s.db.bulk.delete({ table: entry, where: expr(col("leaderboard_id"), "=", ref("action.leaderboard_id")), as: "deleted" }),
            s.db.query({ table: entry, where: expr(col("leaderboard_id"), "=", ref("action.leaderboard_id")), returnType: "count", as: "remaining" }),
            s.db.edit({ table: leaderboard, fieldName: "id", fieldValue: ref("action.leaderboard_id"), row: { entry_count: ref("remaining"), status: "active" } }),
            s.set_var("effect", c.text("Cleared every entry on the board and reset its entry count.")),
          ],
          break: true,
        },
        {
          when: c.text("wipe_entry"),
          body: [
            s.db.get({ table: entry, fieldName: "id", fieldValue: ref("action.entry_id"), as: "victim" }),
            s.precondition({ expr: expr(ref("victim", { safe: true }), "!=", c.null()), error_type: "badrequest", error: c.text("The target entry no longer exists.") }),
            s.db.del({ table: entry, fieldName: "id", fieldValue: ref("action.entry_id") }),
            s.db.query({ table: entry, where: expr(col("leaderboard_id"), "=", ref("victim.leaderboard_id")), returnType: "count", as: "remaining" }),
            s.db.edit({ table: leaderboard, fieldName: "id", fieldValue: ref("victim.leaderboard_id"), row: { entry_count: ref("remaining") } }),
            s.set_var("effect", c.text("Removed the flagged entry and recomputed the board entry count.")),
          ],
          break: true,
        },
        {
          when: c.text("grant_reward"),
          body: [s.set_var("effect", c.text("Recorded the reward grant in the append-only audit trail."))],
          break: true,
        },
      ],
    }),

    s.db.edit({ table: opsAction, fieldName: "id", fieldValue: inp("ops_action_id"), row: { status: "executed" }, as: "updated" }),
    s.function.run({
      fn: writeAudit,
      input: {
        actor_id: auth("id"),
        action: c.text("action.executed"),
        ops_action_id: inp("ops_action_id"),
        detail: obj({ type: ref("action.type"), effect: ref("effect"), payload: ref("action.payload_json") }),
        rule_version: ref("rule.version"),
      },
    }),
  ],
  response: { action: ref("updated"), effect: ref("effect") },
});
