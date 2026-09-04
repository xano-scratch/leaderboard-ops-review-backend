import { table, f } from "@xanots/sdk";

/**
 * The versioned rule set (single active row). Per-type columns keep the mapping
 * data-driven and readable at runtime without dynamic JSON-key reads, and every
 * decision stamps the `version` it applied so the trail is reproducible.
 */
export const ruleConfig = table({
  name: "rule_config",
  schema: {
    version: f.text({ required: true, default: "v1" }),
    reset_min_role: f.enum(["ops", "lead", "admin"], { required: true, default: "admin" }),
    wipe_min_role: f.enum(["ops", "lead", "admin"], { required: true, default: "lead" }),
    reward_min_role: f.enum(["ops", "lead", "admin"], { required: true, default: "lead" }),
    reset_sensitive: f.bool({ default: true }),
    wipe_sensitive: f.bool({ default: true }),
    reward_sensitive: f.bool({ default: false }),
    active: f.bool({ default: true }),
  },
});
