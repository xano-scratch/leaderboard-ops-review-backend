import { query, input, inp, ref, col, cmp, s } from "@xanots/sdk";
import { auditApi } from "./groups.js";
import { operator } from "../tables/operator.js";
import { auditLog } from "../tables/audit-log.js";

/**
 * The audit trail, filterable by actor, action id, or event name. Every row
 * carries the rule_version that applied. Each filter is optional (dropped when
 * its input is empty).
 */
export const auditQueryQuery = query({
  name: "audit_query",
  verb: "GET",
  apiGroup: auditApi,
  auth: operator,
  input: {
    actor_id: input.int({ required: false }),
    ops_action_id: input.int({ required: false }),
    action: input.text({ required: false }),
  },
  stack: [
    s.db.query({
      table: auditLog,
      where: [
        cmp(col("actor_id"), "=", inp("actor_id"), { ignoreEmpty: true }),
        cmp(col("ops_action_id"), "=", inp("ops_action_id"), { ignoreEmpty: true }),
        cmp(col("action"), "=", inp("action"), { ignoreEmpty: true }),
      ],
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: { rows: ref("rows") },
});
