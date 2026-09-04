import { query, input, inp, ref, col, cmp, expr, s, c } from "@xanots/sdk";
import { opsApi } from "./groups.js";
import { operator } from "../tables/operator.js";
import { opsAction } from "../tables/ops-action.js";
import { ruleConfig } from "../tables/rule-config.js";

/**
 * The review queue: ops_actions (optionally filtered by status), the operator
 * directory (so the frontend can name requesters/approvers), and the active rule
 * version for the header.
 */
export const actionsQueueQuery = query({
  name: "actions_queue",
  verb: "GET",
  apiGroup: opsApi,
  auth: operator,
  input: { status: input.text({ required: false }) },
  stack: [
    s.db.query({
      table: opsAction,
      where: cmp(col("status"), "=", inp("status"), { ignoreEmpty: true }),
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "rows",
    }),
    s.db.query({ table: operator, sort: [{ sortBy: "id", dir: "asc" }], output: ["id", "name", "role"], as: "ops" }),
    s.db.query({ table: ruleConfig, where: expr(col("active"), "=", c.bool(true)), returnType: "single", as: "cfg" }),
  ],
  response: { actions: ref("rows"), operators: ref("ops"), ruleVersion: ref("cfg.version", { safe: true }) },
});
