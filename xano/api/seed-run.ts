import { query, input, inp, ref, expr, or, c, s } from "@xanots/sdk";
import { seedApi } from "./groups.js";
import { operator } from "../tables/operator.js";
import { leaderboard } from "../tables/leaderboard.js";
import { entry } from "../tables/entry.js";
import { opsAction } from "../tables/ops-action.js";
import { approval } from "../tables/approval.js";
import { auditLog } from "../tables/audit-log.js";
import { ruleConfig } from "../tables/rule-config.js";
import { writeAudit } from "../functions/write-audit.js";

/**
 * Idempotent demo seed: seeds only when the workspace is empty, or when `force`
 * is set (the "reset demo" button). Populates operators across all three roles,
 * two boards with ranked entries (one flagged cheat at #1), the active v1 rule
 * set, and a few in-flight actions plus a pre-seeded guard.denied, so a fresh
 * ephemeral shows a populated queue and audit trail. auth:false — public.
 */
export const seedRunQuery = query({
  name: "seed_run",
  verb: "POST",
  apiGroup: seedApi,
  auth: false,
  input: { force: input.bool({ required: false, default: false }) },
  stack: [
    s.db.query({ table: operator, returnType: "count", as: "opCount" }),
    s.set_var("seeded", c.bool(false)),
    s.conditional({
      when: or(expr(ref("opCount"), "=", c.int(0)), expr(inp("force"), "=", c.bool(true))),
      then: [
        // Clean slate (also resets id sequences).
        s.db.truncate({ table: auditLog, reset: true }),
        s.db.truncate({ table: approval, reset: true }),
        s.db.truncate({ table: opsAction, reset: true }),
        s.db.truncate({ table: entry, reset: true }),
        s.db.truncate({ table: leaderboard, reset: true }),
        s.db.truncate({ table: ruleConfig, reset: true }),
        s.db.truncate({ table: operator, reset: true }),

        // The one active rule set.
        s.db.add({
          table: ruleConfig,
          row: { version: "v1", reset_min_role: "admin", wipe_min_role: "lead", reward_min_role: "lead", reset_sensitive: true, wipe_sensitive: true, reward_sensitive: false, active: true },
        }),

        // Operators (password hashes on write — demo fixtures only).
        s.db.add({ table: operator, row: { email: "priya@studio.games", password: "password123", name: "Priya Rao", role: "ops", active: true }, as: "priya" }),
        s.db.add({ table: operator, row: { email: "marco@studio.games", password: "password123", name: "Marco Diaz", role: "lead", active: true }, as: "marco" }),
        s.db.add({ table: operator, row: { email: "dana@studio.games", password: "password123", name: "Dana Kim", role: "admin", active: true }, as: "dana" }),

        // Boards + ranked entries.
        s.db.add({ table: leaderboard, row: { name: "Ranked Ladder", game_mode: "1v1", season: 7, status: "active", entry_count: 4 }, as: "b1" }),
        s.db.add({ table: leaderboard, row: { name: "Squad Cup", game_mode: "4v4", season: 7, status: "active", entry_count: 3 }, as: "b2" }),

        s.db.add({ table: entry, row: { leaderboard_id: ref("b1.id"), player_handle: "xX_snipez", score: 999999, rank: 1, flagged_cheat: true }, as: "cheat" }),
        s.db.add({ table: entry, row: { leaderboard_id: ref("b1.id"), player_handle: "vex_prime", score: 82150, rank: 2, flagged_cheat: false } }),
        s.db.add({ table: entry, row: { leaderboard_id: ref("b1.id"), player_handle: "ghostbyte", score: 76040, rank: 3, flagged_cheat: false } }),
        s.db.add({ table: entry, row: { leaderboard_id: ref("b1.id"), player_handle: "novaflux", score: 71110, rank: 4, flagged_cheat: false }, as: "reward_entry" }),
        s.db.add({ table: entry, row: { leaderboard_id: ref("b2.id"), player_handle: "team_apex", score: 150000, rank: 1, flagged_cheat: false } }),
        s.db.add({ table: entry, row: { leaderboard_id: ref("b2.id"), player_handle: "team_volt", score: 142300, rank: 2, flagged_cheat: false } }),
        s.db.add({ table: entry, row: { leaderboard_id: ref("b2.id"), player_handle: "team_zen", score: 138900, rank: 3, flagged_cheat: false } }),

        // In-flight actions (all pending) so the queue is populated on load.
        s.db.add({
          table: opsAction,
          row: { type: "wipe_entry", leaderboard_id: ref("b1.id"), entry_id: ref("cheat.id"), requested_by: ref("priya.id"), status: "pending", reason: "Score at #1 is impossible for this mode; anti-cheat flagged it.", sensitive: true, min_role: "lead", rule_version: "v1" },
          as: "act_wipe",
        }),
        s.db.add({
          table: opsAction,
          row: { type: "reset_leaderboard", leaderboard_id: ref("b2.id"), entry_id: c.int(0), requested_by: ref("marco.id"), status: "pending", reason: "Season rollover for Squad Cup.", sensitive: true, min_role: "admin", rule_version: "v1" },
          as: "act_reset",
        }),
        s.db.add({
          table: opsAction,
          row: { type: "grant_reward", leaderboard_id: ref("b1.id"), entry_id: ref("reward_entry.id"), payload_json: c.obj({ reward: "500 credits", note: "Top-4 season reward" }), requested_by: ref("priya.id"), status: "pending", reason: "Season reward for a top-4 finish.", sensitive: false, min_role: "lead", rule_version: "v1" },
          as: "act_reward",
        }),

        // Seed the trail: each request, plus a pre-seeded SoD denial on the wipe.
        s.function.run({ fn: writeAudit, input: { actor_id: ref("priya.id"), action: c.text("action.requested"), ops_action_id: ref("act_wipe.id"), detail: c.obj({ type: "wipe_entry", sensitive: true }), rule_version: c.text("v1") } }),
        s.function.run({ fn: writeAudit, input: { actor_id: ref("marco.id"), action: c.text("action.requested"), ops_action_id: ref("act_reset.id"), detail: c.obj({ type: "reset_leaderboard", sensitive: true }), rule_version: c.text("v1") } }),
        s.function.run({ fn: writeAudit, input: { actor_id: ref("priya.id"), action: c.text("action.requested"), ops_action_id: ref("act_reward.id"), detail: c.obj({ type: "grant_reward", sensitive: false }), rule_version: c.text("v1") } }),
        s.function.run({ fn: writeAudit, input: { actor_id: ref("priya.id"), action: c.text("guard.denied"), ops_action_id: ref("act_wipe.id"), detail: c.obj({ guard: "segregation_of_duties", note: "requester tried to approve their own wipe" }), rule_version: c.text("v1") } }),

        s.update_var("seeded", c.bool(true)),
      ],
    }),
  ],
  response: { seeded: ref("seeded") },
});
