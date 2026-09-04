import { defineFunction, input, inp, ref, col, expr, s, c } from "@xanots/sdk";
import { ruleConfig } from "../tables/rule-config.js";

/**
 * Resolve sensitivity + the minimum approver role for an action type from the
 * single active rule set, and report the version so callers can stamp the trail.
 */
export const resolveRule = defineFunction({
  name: "resolve_rule",
  input: { action_type: input.text({ required: true }) },
  stack: [
    s.db.query({ table: ruleConfig, where: expr(col("active"), "=", c.bool(true)), returnType: "single", as: "cfg" }),
    s.precondition({
      expr: expr(ref("cfg", { safe: true }), "!=", c.null()),
      error_type: "standard",
      error: c.text("No active rule configuration. Run seed_run first."),
    }),
    s.set_var("min_role", c.text("admin")),
    s.set_var("sensitive", c.bool(false)),
    s.switch({
      on: inp("action_type"),
      cases: [
        { when: c.text("reset_leaderboard"), body: [s.update_var("min_role", ref("cfg.reset_min_role")), s.update_var("sensitive", ref("cfg.reset_sensitive"))], break: true },
        { when: c.text("wipe_entry"), body: [s.update_var("min_role", ref("cfg.wipe_min_role")), s.update_var("sensitive", ref("cfg.wipe_sensitive"))], break: true },
        { when: c.text("grant_reward"), body: [s.update_var("min_role", ref("cfg.reward_min_role")), s.update_var("sensitive", ref("cfg.reward_sensitive"))], break: true },
      ],
    }),
  ],
  response: { version: ref("cfg.version"), min_role: ref("min_role"), sensitive: ref("sensitive") },
});
