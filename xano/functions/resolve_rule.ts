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
    // Minimum approver role, read per type from the rule set's mapping. A
    // missing per-type entry must FAIL SAFE to the most restrictive role, not
    // to null: `role_rank(null)` is 0, which makes every role guard pass for
    // any operator, so a misconfigured rule set would silently let anyone
    // approve and execute a governed action. Both the base default and each
    // `get` fall back to "admin" so an incomplete rule set locks down.
    s.set_var("min_role", c.text("admin")),
    s.conditional({
      when: expr(inp("type"), "=", c.text("reset_leaderboard")),
      then: [s.update_var("min_role", withFilters(ref("cfg"), fl.get("min_approver_role.reset_leaderboard", c.text("admin"))))],
      elif: [
        {
          when: expr(inp("type"), "=", c.text("wipe_entry")),
          then: [s.update_var("min_role", withFilters(ref("cfg"), fl.get("min_approver_role.wipe_entry", c.text("admin"))))],
        },
        {
          when: expr(inp("type"), "=", c.text("grant_reward")),
          then: [s.update_var("min_role", withFilters(ref("cfg"), fl.get("min_approver_role.grant_reward", c.text("admin"))))],
        },
      ],
    }),
  ],
  response: { sensitive: ref("is_sensitive"), min_role: ref("min_role"), version: ref("cfg.version") },
});
