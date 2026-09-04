import { query, input, inp, ref, auth, expr, obj, s, c } from "@xanots/sdk";
import { opsApi } from "./groups.js";
import { operator } from "../tables/operator.js";
import { opsAction } from "../tables/ops-action.js";
import { approval } from "../tables/approval.js";
import { resolveRule } from "../functions/resolve-rule.js";
import { roleRank } from "../functions/role-rank.js";
import { writeAudit } from "../functions/write-audit.js";

/**
 * A lead+ operator records an approve/reject. Two guards run at the API layer no
 * matter what the frontend sends: the caller's role must meet the type's minimum
 * approver role, AND the approver must differ from the requester (segregation of
 * duties). A violation writes a `guard.denied` row BEFORE the refusal, so the
 * denial survives in the trail.
 */
export const actionApproveQuery = query({
  name: "action_approve",
  verb: "POST",
  apiGroup: opsApi,
  auth: operator,
  input: {
    ops_action_id: input.int({ required: true }),
    decision: input.enum(["approve", "reject"], { required: true }),
    note: input.text({ required: false }),
  },
  stack: [
    s.db.get({ table: opsAction, fieldName: "id", fieldValue: inp("ops_action_id"), as: "action" }),
    s.precondition({ expr: expr(ref("action", { safe: true }), "!=", c.null()), error_type: "notfound", error: c.text("Action not found.") }),
    s.precondition({ expr: expr(ref("action.status"), "=", c.text("pending")), error_type: "badrequest", error: c.text("This action is not pending.") }),
    s.db.get({ table: operator, fieldName: "id", fieldValue: auth("id"), output: ["id", "name", "role"], as: "me" }),
    s.function.run({ fn: resolveRule, input: { action_type: ref("action.type") }, as: "rule" }),
    s.function.run({ fn: roleRank, input: { role: ref("me.role") }, as: "callerRank" }),
    s.function.run({ fn: roleRank, input: { role: ref("rule.min_role") }, as: "needRank" }),

    // GUARD 1 — role must meet the type's minimum approver role.
    s.conditional({
      when: expr(ref("callerRank.rank"), "<", ref("needRank.rank")),
      then: [
        s.function.run({
          fn: writeAudit,
          input: {
            actor_id: auth("id"),
            action: c.text("guard.denied"),
            ops_action_id: inp("ops_action_id"),
            detail: obj({ guard: c.text("role_below_required"), required: ref("rule.min_role"), caller: ref("me.role") }),
            rule_version: ref("rule.version"),
          },
        }),
      ],
    }),
    s.precondition({
      expr: expr(ref("callerRank.rank"), ">=", ref("needRank.rank")),
      error_type: "accessdenied",
      error: c.text("Your role is below the required approver role for this action type."),
    }),

    // GUARD 2 — segregation of duties: the approver must differ from the requester.
    s.conditional({
      when: expr(auth("id"), "=", ref("action.requested_by")),
      then: [
        s.function.run({
          fn: writeAudit,
          input: {
            actor_id: auth("id"),
            action: c.text("guard.denied"),
            ops_action_id: inp("ops_action_id"),
            detail: obj({ guard: c.text("segregation_of_duties"), requester: ref("action.requested_by"), approver: auth("id") }),
            rule_version: ref("rule.version"),
          },
        }),
      ],
    }),
    s.precondition({
      expr: expr(auth("id"), "!=", ref("action.requested_by")),
      error_type: "accessdenied",
      error: c.text("Segregation of duties: the approver must be different from the requester."),
    }),

    // Record the decision and move the action.
    s.db.add({ table: approval, row: { ops_action_id: inp("ops_action_id"), decided_by: auth("id"), decision: inp("decision"), note: inp("note") }, as: "appr" }),
    s.set_var("newStatus", c.text("approved")),
    s.conditional({ when: expr(inp("decision"), "=", c.text("reject")), then: [s.update_var("newStatus", c.text("rejected"))] }),
    s.db.edit({ table: opsAction, fieldName: "id", fieldValue: inp("ops_action_id"), row: { status: ref("newStatus") }, as: "updated" }),
    s.function.run({
      fn: writeAudit,
      input: {
        actor_id: auth("id"),
        action: c.text("approval.recorded"),
        ops_action_id: inp("ops_action_id"),
        detail: obj({ decision: inp("decision"), new_status: ref("newStatus"), note: inp("note") }),
        rule_version: ref("rule.version"),
      },
    }),
  ],
  response: { action: ref("updated"), decision: inp("decision"), status: ref("newStatus") },
});
