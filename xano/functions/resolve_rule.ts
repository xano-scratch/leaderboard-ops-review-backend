import { defineFunction, input, s, c, ref, inp, col, expr, withFilters, fl } from "@xanots/sdk";
import { rule_config } from "../tables/rule_config.js";

/**
 * Read the single active rule_config row and derive, for one action type:
 * whether it needs a distinct second approver, the minimum role that may
 * approve it, and the version to stamp on the trail. This is the versioned
 * rule set made concrete, in one readable place other endpoints call.
 */
export const resolveRule = defineFunction({
  name: "lorb_resolve_rule",
  description: "Derive sensitivity, minimum approver role, and rule version for an action type from the active rule set.",
  input: { type: input.text({ required: true }) },
  stack: [
    s.db.query({
      table: rule_config,
      where: expr(col("active"), "=", c.bool(true)),
      returnType: "single",
      as: "cfg",
    }),
    s.precondition({
      expr: expr(ref("cfg"), "!=", c.null()),
      error_type: "standard",
      error: c.text("No active rule set."),
    }),
    // Sensitive when the type is listed in the active rule set's sensitive_types array.
    s.set_var("is_sensitive", withFilters(inp("type"), fl.in(ref("cfg.sensitive_types")))),
    // Minimum approver role, read per type from the rule set's mapping.
    s.set_var("min_role", c.text("lead")),
    s.conditional({
      when: expr(inp("type"), "=", c.text("reset_leaderboard")),
      then: [s.update_var("min_role", ref("cfg.min_approver_role.reset_leaderboard", { safe: true }))],
      elif: [
        {
          when: expr(inp("type"), "=", c.text("wipe_entry")),
          then: [s.update_var("min_role", ref("cfg.min_approver_role.wipe_entry", { safe: true }))],
        },
        {
          when: expr(inp("type"), "=", c.text("grant_reward")),
          then: [s.update_var("min_role", ref("cfg.min_approver_role.grant_reward", { safe: true }))],
        },
      ],
    }),
  ],
  response: { sensitive: ref("is_sensitive"), min_role: ref("min_role"), version: ref("cfg.version") },
});
