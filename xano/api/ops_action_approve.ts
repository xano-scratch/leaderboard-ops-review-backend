import { query, input, s, c, ref, inp, auth, expr, obj } from "@xanots/sdk";
import { opsGroup } from "./groups.js";
import { operator } from "../tables/operator.js";
import { ops_action } from "../tables/ops_action.js";
import { approval } from "../tables/approval.js";
import { roleRank } from "../functions/role_rank.js";
import { writeAudit } from "../functions/write_audit.js";

/**
 * Record an approve/reject decision on a pending action. Two guards live here,
 * and both are API-layer, so no frontend can skip them:
 *   1. Role guard: the caller's role must meet the action's minimum approver
 *      role (resolved from the rule set at request time).
 *   2. Segregation of duties: the approver must differ from the requester.
 * A violation writes a `guard.denied` row to the audit trail BEFORE the request
 * is refused, so the attempt survives in the record.
 */
export const actionApproveQuery = query({
  name: "action_approve",
  verb: "POST",
  apiGroup: opsGroup,
  auth: operator,
  input: {
    ops_action_id: input.int({ required: true }),
    decision: input.enum(["approve", "reject"], { required: true }),
    note: input.text({ default: "" }),
  },
  stack: [
    s.db.get({ table: ops_action, fieldValue: inp("ops_action_id"), as: "action" }),
    s.precondition({
      expr: expr(ref("action", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Action not found."),
    }),
    s.precondition({
      expr: expr(ref("action.status"), "=", c.text("pending")),
      error_type: "badrequest",
      error: c.text("This action is no longer pending."),
    }),
    s.db.get({ table: operator, fieldValue: auth("id"), output: ["id", "name", "role"], as: "caller" }),
    s.function.run({ fn: roleRank, input: { role: ref("caller.role") }, as: "caller_rr" }),
    s.function.run({ fn: roleRank, input: { role: ref("action.min_approver_role") }, as: "min_rr" }),
    // --- Guard 1: role below the required minimum ---
    s.conditional({
      when: expr(ref("caller_rr.rank"), "<", ref("min_rr.rank")),
      then: [
        s.function.run({
          fn: writeAudit,
          input: {
            actor_id: auth("id"),
            action: c.text("guard.denied"),
            ops_action_id: ref("action.id"),
            detail_json: obj({
              guard: c.text("min_approver_role"),
              required: ref("action.min_approver_role"),
              caller_role: ref("caller.role"),
            }),
            rule_version: ref("action.rule_version"),
          },
        }),
      ],
    }),
    s.precondition({
      expr: expr(ref("caller_rr.rank"), ">=", ref("min_rr.rank")),
      error_type: "accessdenied",
      error: c.text("Your role may not approve this action type."),
    }),
    // --- Guard 2: segregation of duties (approver != requester) ---
    s.conditional({
      when: expr(auth("id"), "=", ref("action.requested_by")),
      then: [
        s.function.run({
          fn: writeAudit,
          input: {
            actor_id: auth("id"),
            action: c.text("guard.denied"),
            ops_action_id: ref("action.id"),
            detail_json: obj({
              guard: c.text("segregation_of_duties"),
              requested_by: ref("action.requested_by"),
            }),
            rule_version: ref("action.rule_version"),
          },
        }),
      ],
    }),
    s.precondition({
      expr: expr(auth("id"), "!=", ref("action.requested_by")),
      error_type: "accessdenied",
      error: c.text("You cannot approve your own request. A different operator must review it."),
    }),
    // Record the decision.
    s.db.add({
      table: approval,
      row: {
        ops_action_id: ref("action.id"),
        decided_by: auth("id"),
        decision: inp("decision"),
        note: inp("note"),
      },
      as: "approval_row",
    }),
    // Move the action to approved or rejected.
    s.set_var("new_status", c.text("approved")),
    s.conditional({
      when: expr(inp("decision"), "=", c.text("reject")),
      then: [s.update_var("new_status", c.text("rejected"))],
    }),
    s.db.edit({ table: ops_action, fieldValue: ref("action.id"), row: { status: ref("new_status") }, as: "updated" }),
    s.function.run({
      fn: writeAudit,
      input: {
        actor_id: auth("id"),
        action: c.text("approval.recorded"),
        ops_action_id: ref("action.id"),
        detail_json: obj({ decision: inp("decision"), new_status: ref("new_status") }),
        rule_version: ref("action.rule_version"),
      },
    }),
  ],
  response: { action: ref("updated"), approval: ref("approval_row") },
});
