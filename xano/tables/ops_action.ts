import { table, f } from "@xanots/sdk";
import { leaderboard } from "./leaderboard.js";
import { entry } from "./entry.js";
import { operator } from "./operator.js";

/**
 * A requested sensitive action against game state. Its sensitivity, the
 * minimum approver role, and the rule version are DENORMALIZED from the active
 * rule_config at request time (see the resolve_rule function), so the decision
 * trail stays reproducible even if the rule set changes later.
 *
 * `leaderboard_id` / `entry_id` are optional foreign keys: an unset one is the
 * `0` sentinel (never null in the column), which db.get reads back as null.
 */
export const ops_action = table({
  name: "ops_action",
  schema: {
    type: f.enum(["reset_leaderboard", "wipe_entry", "grant_reward"], { required: true }),
    leaderboard_id: f.tableRef(leaderboard, { default: 0 }),
    entry_id: f.tableRef(entry, { default: 0 }),
    payload_json: f.json(),
    requested_by: f.tableRef(operator, { required: true }),
    status: f.enum(["pending", "approved", "rejected", "executed"], { default: "pending" }),
    reason: f.text(),
    // Stamped from the active rule set when the action is requested.
    sensitive: f.bool({ default: false }),
    min_approver_role: f.enum(["ops", "lead", "admin"], { default: "lead" }),
    rule_version: f.text({ default: "" }),
  },
});
