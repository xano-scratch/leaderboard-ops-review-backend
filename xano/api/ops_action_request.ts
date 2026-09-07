import { query, input, s, c, ref, inp, auth, expr, obj } from "@xanots/sdk";
import { opsGroup } from "./groups.js";
import { operator } from "../tables/operator.js";
import { ops_action } from "../tables/ops_action.js";
import { leaderboard } from "../tables/leaderboard.js";
import { entry } from "../tables/entry.js";
import { resolveRule } from "../functions/resolve_rule.js";
import { writeAudit } from "../functions/write_audit.js";

/**
 * An authenticated operator requests a sensitive action. The endpoint checks
 * the target exists, resolves sensitivity + the minimum approver role + the
 * rule version from the active rule set, records the action as `pending`, and
 * appends an `action.requested` row to the audit trail. Nothing is applied
 * here; that waits for a distinct approver and an execute call.
 */
export const actionRequestQuery = query({
  name: "action_request",
  verb: "POST",
  apiGroup: opsGroup,
  auth: operator,
  input: {
    type: input.enum(["reset_leaderboard", "wipe_entry", "grant_reward"], { required: true }),
    leaderboard_id: input.int({ default: 0 }),
    entry_id: input.int({ default: 0 }),
    payload_json: input.json(),
    reason: input.text({ default: "" }),
  },
  stack: [
    // Read the possible targets. A 0 sentinel binds null through the field match.
    s.db.get({ table: leaderboard, fieldName: "id", fieldValue: inp("leaderboard_id"), as: "lb" }),
    s.db.get({ table: entry, fieldName: "id", fieldValue: inp("entry_id"), as: "ent" }),
    // Validate the target that this action type needs.
    s.conditional({
      when: expr(inp("type"), "=", c.text("reset_leaderboard")),
      then: [
        s.precondition({
          expr: expr(ref("lb", { safe: true }), "!=", c.null()),
          error_type: "badrequest",
          error: c.text("Leaderboard not found."),
        }),
      ],
      elif: [
        {
          when: expr(inp("type"), "=", c.text("wipe_entry")),
          then: [
            s.precondition({
              expr: expr(ref("ent", { safe: true }), "!=", c.null()),
              error_type: "badrequest",
              error: c.text("Entry not found."),
            }),
          ],
        },
        {
          when: expr(inp("type"), "=", c.text("grant_reward")),
          then: [
            s.precondition({
              expr: expr(ref("ent", { safe: true }), "!=", c.null()),
              error_type: "badrequest",
              error: c.text("Entry not found for the reward."),
            }),
          ],
        },
      ],
    }),
    // Derive the governed attributes from the active rule set.
    s.function.run({ fn: resolveRule, input: { type: inp("type") }, as: "rule" }),
    // Record the pending action, stamping the rule it resolved under.
    s.db.add({
      table: ops_action,
      row: {
        type: inp("type"),
        leaderboard_id: inp("leaderboard_id"),
        entry_id: inp("entry_id"),
        payload_json: inp("payload_json"),
        requested_by: auth("id"),
        status: "pending",
        reason: inp("reason"),
        sensitive: ref("rule.sensitive"),
        min_approver_role: ref("rule.min_role"),
        rule_version: ref("rule.version"),
      },
      as: "action",
    }),
    // Append the request to the audit trail.
    s.function.run({
      fn: writeAudit,
      input: {
        actor_id: auth("id"),
        action: c.text("action.requested"),
        ops_action_id: ref("action.id"),
        detail_json: obj({
          type: inp("type"),
          sensitive: ref("rule.sensitive"),
          min_approver_role: ref("rule.min_role"),
        }),
        rule_version: ref("rule.version"),
      },
    }),
  ],
  response: ref("action"),
});
