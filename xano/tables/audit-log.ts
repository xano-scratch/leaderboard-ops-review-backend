import { table, f } from "@xanots/sdk";
import { operator } from "./operator.js";
import { opsAction } from "./ops-action.js";

/**
 * Append-only trail. Never updated or deleted. actor_id/ops_action_id use the 0
 * sentinel for system/none rows, so a field-match read binds null cleanly.
 */
export const auditLog = table({
  name: "audit_log",
  schema: {
    actor_id: f.tableRef(operator, { required: true, default: 0 }),
    action: f.text({ required: true }),
    ops_action_id: f.tableRef(opsAction, { required: true, default: 0 }),
    detail_json: f.json(),
    rule_version: f.text({ default: "" }),
  },
  index: [{ type: "btree", fields: [{ name: "ops_action_id" }] }],
});
