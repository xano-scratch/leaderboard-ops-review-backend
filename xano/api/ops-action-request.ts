import { query, input, inp, ref, auth, expr, or, obj, s, c } from "@xanots/sdk";
import { opsApi } from "./groups.js";
import { operator } from "../tables/operator.js";
import { opsAction } from "../tables/ops-action.js";
import { leaderboard } from "../tables/leaderboard.js";
import { entry } from "../tables/entry.js";
import { resolveRule } from "../functions/resolve-rule.js";
import { writeAudit } from "../functions/write-audit.js";

/**
 * An authenticated operator requests an action. Validates the target exists,
 * derives sensitivity from the active rule set, writes `pending`, and stamps an
 * `action.requested` audit row. Nothing runs here — that is action_execute.
 */
export const actionRequestQuery = query({
  name: "action_request",
  verb: "POST",
  apiGroup: opsApi,
  auth: operator,
  input: {
    type: input.enum(["reset_leaderboard", "wipe_entry", "grant_reward"], { required: true }),
    leaderboard_id: input.int({ required: false, default: 0 }),
    entry_id: input.int({ required: false, default: 0 }),
    payload_json: input.json({ required: false }),
    reason: input.text({ required: true }),
  },
  stack: [
    // Validate the target exists for the chosen type (0 sentinel binds null on a field-match).
    s.conditional({
      when: expr(inp("type"), "=", c.text("reset_leaderboard")),
      then: [
        s.db.get({ table: leaderboard, fieldName: "id", fieldValue: inp("leaderboard_id"), as: "board" }),
        s.precondition({
          expr: expr(ref("board", { safe: true }), "!=", c.null()),
          error_type: "badrequest",
          error: c.text("That leaderboard does not exist."),
        }),
      ],
    }),
    s.conditional({
      when: or(expr(inp("type"), "=", c.text("wipe_entry")), expr(inp("type"), "=", c.text("grant_reward"))),
      then: [
        s.db.get({ table: entry, fieldName: "id", fieldValue: inp("entry_id"), as: "ent" }),
        s.precondition({
          expr: expr(ref("ent", { safe: true }), "!=", c.null()),
          error_type: "badrequest",
          error: c.text("That entry does not exist."),
        }),
      ],
    }),
    s.function.run({ fn: resolveRule, input: { action_type: inp("type") }, as: "rule" }),
    s.db.add({
      table: opsAction,
      row: {
        type: inp("type"),
        leaderboard_id: inp("leaderboard_id"),
        entry_id: inp("entry_id"),
        payload_json: inp("payload_json"),
        requested_by: auth("id"),
        status: "pending",
        reason: inp("reason"),
        sensitive: ref("rule.sensitive"),
        min_role: ref("rule.min_role"),
        rule_version: ref("rule.version"),
      },
      as: "action",
    }),
    s.function.run({
      fn: writeAudit,
      input: {
        actor_id: auth("id"),
        action: c.text("action.requested"),
        ops_action_id: ref("action.id"),
        detail: obj({ type: inp("type"), sensitive: ref("rule.sensitive"), min_role: ref("rule.min_role"), reason: inp("reason") }),
        rule_version: ref("rule.version"),
      },
      as: "audited",
    }),
  ],
  response: { action: ref("action"), sensitive: ref("rule.sensitive"), min_role: ref("rule.min_role") },
});
