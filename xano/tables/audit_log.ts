import { table, f } from "@xanots/sdk";
import { operator } from "./operator.js";
import { ops_action } from "./ops_action.js";

/**
 * Append-only trail. Every request, guard denial, approval, and execution
 * writes exactly one row here (through the write_audit function), stamped with
 * the rule version that applied. Nothing in the app updates or deletes a row.
 *
 * `actor_id` / `ops_action_id` are optional foreign keys (a system row has no
 * actor): an unset one is the `0` sentinel.
 */
export const audit_log = table({
  name: "audit_log",
  schema: {
    actor_id: f.tableRef(operator, { default: 0 }),
    action: f.text({ required: true }),
    ops_action_id: f.tableRef(ops_action, { default: 0 }),
    detail_json: f.json(),
    rule_version: f.text({ default: "" }),
  },
});
