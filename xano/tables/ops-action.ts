import { table, f } from "@xanots/sdk";
import { leaderboard } from "./leaderboard.js";
import { entry } from "./entry.js";
import { operator } from "./operator.js";

/**
 * A requested sensitive action, moving through pending → approved/rejected → executed.
 * Sensitivity + the minimum approver role are derived from the active rule_config at
 * request time and denormalized here so the queue can render + the trail stays reproducible.
 */
export const opsAction = table({
  name: "ops_action",
  schema: {
    type: f.enum(["reset_leaderboard", "wipe_entry", "grant_reward"], { required: true }),
    // Optional FKs use the 0 sentinel (not nullable), so a field-match read binds null cleanly.
    leaderboard_id: f.tableRef(leaderboard, { required: true, default: 0 }),
    entry_id: f.tableRef(entry, { required: true, default: 0 }),
    payload_json: f.json(),
    requested_by: f.tableRef(operator, { required: true }),
    status: f.enum(["pending", "approved", "rejected", "executed"], { required: true, default: "pending" }),
    reason: f.text(),
    sensitive: f.bool({ default: false }),
    min_role: f.enum(["ops", "lead", "admin"], { required: true, default: "lead" }),
    rule_version: f.text({ default: "" }),
  },
});
