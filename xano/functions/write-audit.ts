import { defineFunction, input, inp, ref, s } from "@xanots/sdk";
import { auditLog } from "../tables/audit-log.js";

/** The one append-only trail write every endpoint calls (0 actor = system row). */
export const writeAudit = defineFunction({
  name: "write_audit",
  input: {
    actor_id: input.int({ required: false, default: 0 }),
    action: input.text({ required: true }),
    ops_action_id: input.int({ required: false, default: 0 }),
    detail: input.json({ required: false }),
    rule_version: input.text({ required: false, default: "" }),
  },
  stack: [
    s.db.add({
      table: auditLog,
      row: {
        actor_id: inp("actor_id"),
        action: inp("action"),
        ops_action_id: inp("ops_action_id"),
        detail_json: inp("detail"),
        rule_version: inp("rule_version"),
      },
      as: "row",
    }),
  ],
  response: { id: ref("row.id") },
});
