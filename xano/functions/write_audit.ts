import { defineFunction, input, s, inp, ref } from "@xanots/sdk";
import { audit_log } from "../tables/audit_log.js";

/**
 * The one append-only write into audit_log. Every endpoint records what
 * happened through this function: action.requested, guard.denied,
 * approval.recorded, action.executed. Centralizing the write is the point of
 * an audit trail: there is a single code path that appends, and nothing edits.
 */
export const writeAudit = defineFunction({
  name: "lorb_write_audit",
  description: "Append one row to the audit trail.",
  input: {
    actor_id: input.int({ default: 0 }),
    action: input.text({ required: true }),
    ops_action_id: input.int({ default: 0 }),
    detail_json: input.json(),
    rule_version: input.text({ default: "" }),
  },
  stack: [
    s.db.add({
      table: audit_log,
      row: {
        actor_id: inp("actor_id"),
        action: inp("action"),
        ops_action_id: inp("ops_action_id"),
        detail_json: inp("detail_json"),
        rule_version: inp("rule_version"),
      },
      as: "row",
    }),
  ],
  response: ref("row"),
});
