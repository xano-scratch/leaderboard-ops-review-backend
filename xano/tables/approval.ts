import { table, f } from "@xanots/sdk";
import { ops_action } from "./ops_action.js";
import { operator } from "./operator.js";

/**
 * One approve/reject decision on an ops_action. Segregation of duties is
 * enforced in action_approve: `decided_by` must differ from the action's
 * `requested_by`.
 */
export const approval = table({
  name: "approval",
  schema: {
    ops_action_id: f.tableRef(ops_action, { required: true }),
    decided_by: f.tableRef(operator, { required: true }),
    decision: f.enum(["approve", "reject"], { required: true }),
    note: f.text(),
  },
});
