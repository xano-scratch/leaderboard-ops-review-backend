import { table, f } from "@xanots/sdk";

/**
 * The versioned rule set. One row is active at a time. It answers two
 * questions for each action type: does it need a distinct second approver
 * (`sensitive_types`), and what is the minimum role that may approve it
 * (`min_approver_role`). Every decision stamps `version` so the trail records
 * which rules applied.
 */
export const rule_config = table({
  name: "rule_config",
  schema: {
    version: f.text({ required: true }),
    // JSON array of the action types that need a second approver.
    sensitive_types: f.json(),
    // JSON object mapping each action type to its minimum approver role.
    min_approver_role: f.json(),
    active: f.bool({ default: false }),
  },
});
