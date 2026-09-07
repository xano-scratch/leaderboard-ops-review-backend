import { query, input, s, ref, inp, col, cmp, expr } from "@xanots/sdk";
import { auditGroup } from "./groups.js";
import { operator } from "../tables/operator.js";
import { audit_log } from "../tables/audit_log.js";

/**
 * The audit trail, newest first, filterable by actor, action, or the ops_action
 * it concerns. Each empty filter is dropped (ignoreEmpty), so one endpoint
 * serves the full trail and any narrowed view. The actor name is joined in for
 * display; a system row (actor_id 0) leaves it null.
 */
export const auditQuery = query({
  name: "audit_query",
  verb: "GET",
  apiGroup: auditGroup,
  auth: operator,
  input: {
    actor_id: input.int({ default: 0 }),
    ops_action_id: input.int({ default: 0 }),
    action: input.text({ default: "" }),
  },
  stack: [
    s.db.query({
      table: audit_log,
      where: [
        cmp(col("actor_id"), "=", inp("actor_id"), { ignoreEmpty: true }),
        cmp(col("ops_action_id"), "=", inp("ops_action_id"), { ignoreEmpty: true }),
        cmp(col("action"), "=", inp("action"), { ignoreEmpty: true }),
      ],
      bind: [{ table: operator, as: "actor", join: "left", where: expr(col("actor_id"), "=", col("actor.id")) }],
      eval: [{ name: "actor.name", as: "actor_name" }],
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
