import { table, f } from "@xanots/sdk";
import { opsAction } from "./ops-action.js";
import { operator } from "./operator.js";

/**
 * One approve/reject decision on an ops_action. The segregation-of-duties rule
 * (decided_by must differ from the action's requested_by) is enforced in the
 * approve endpoint, not the schema — access control is API-layer, never RLS.
 */
export const approval = table({
  name: "approval",
  schema: {
    ops_action_id: f.tableRef(opsAction, { required: true }),
    decided_by: f.tableRef(operator, { required: true }),
    decision: f.enum(["approve", "reject"], { required: true }),
    note: f.text(),
  },
  index: [{ type: "btree", fields: [{ name: "ops_action_id" }] }],
});
