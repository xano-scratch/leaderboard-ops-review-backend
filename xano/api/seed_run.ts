import { query, input, s, c, ref, inp, or, expr, obj } from "@xanots/sdk";
import { seedGroup } from "./groups.js";
import { operator } from "../tables/operator.js";
import { leaderboard } from "../tables/leaderboard.js";
import { entry } from "../tables/entry.js";
import { ops_action } from "../tables/ops_action.js";
import { approval } from "../tables/approval.js";
import { audit_log } from "../tables/audit_log.js";
import { rule_config } from "../tables/rule_config.js";
import { writeAudit } from "../functions/write_audit.js";

/**
 * Idempotent demo seed. On a fresh (or `force`) call it resets every table and
 * writes: three operators (one per role), two boards with ranked entries (a
 * suspected cheat sits at #1 of the first), the active v1 rule set, three
 * in-flight actions, and an audit trail that already carries a guard denial.
 * A repeat call without `force` leaves the data as it is.
 */
export const seedRunQuery = query({
  name: "seed_run",
  verb: "POST",
  apiGroup: seedGroup,
  input: { force: input.bool({ default: false }) },
  stack: [
    s.db.query({ table: operator, returnType: "count", as: "op_count" }),
    s.set_var("did_seed", c.bool(false)),
    s.conditional({
      when: or(expr(ref("op_count"), "=", c.int(0)), expr(inp("force"), "=", c.bool(true))),
      then: [
        // Reset every table so a re-seed is clean and ids restart at 1.
        s.db.truncate({ table: audit_log, reset: true }),
        s.db.truncate({ table: approval, reset: true }),
        s.db.truncate({ table: ops_action, reset: true }),
        s.db.truncate({ table: entry, reset: true }),
        s.db.truncate({ table: leaderboard, reset: true }),
        s.db.truncate({ table: operator, reset: true }),
        s.db.truncate({ table: rule_config, reset: true }),
        // The one active rule set (v1): resets and wipes need a distinct second
        // approver; a reset needs an admin, a wipe or a reward needs a lead.
        s.db.add({
          table: rule_config,
          row: {
            version: c.text("v1"),
            sensitive_types: c.array(["reset_leaderboard", "wipe_entry"]),
            min_approver_role: c.obj({ reset_leaderboard: "admin", wipe_entry: "lead", grant_reward: "lead" }),
            active: c.bool(true),
          },
          as: "rc",
        }),
        // Operators across all three roles. Demo password: password123.
        s.db.add({ table: operator, row: { email: c.text("priya@studio.games"), password: c.text("password123"), name: c.text("Priya Rao"), role: "ops", active: c.bool(true) }, as: "op_priya" }),
        s.db.add({ table: operator, row: { email: c.text("marco@studio.games"), password: c.text("password123"), name: c.text("Marco Diaz"), role: "lead", active: c.bool(true) }, as: "op_marco" }),
        s.db.add({ table: operator, row: { email: c.text("dana@studio.games"), password: c.text("password123"), name: c.text("Dana Kim"), role: "admin", active: c.bool(true) }, as: "op_dana" }),
        // Two boards; the top entry on the first is a suspected cheat.
        s.db.add({ table: leaderboard, row: { name: c.text("Ranked Ladder"), game_mode: c.text("1v1 Duel"), season: c.int(7), status: "active", entry_count: c.int(4) }, as: "lb1" }),
        s.db.add({ table: leaderboard, row: { name: c.text("Squad Cup"), game_mode: c.text("4v4 Objective"), season: c.int(7), status: "active", entry_count: c.int(3) }, as: "lb2" }),
        s.db.add({ table: entry, row: { leaderboard_id: ref("lb1.id"), player_handle: c.text("xX_Nova_Xx"), score: c.int(99999), rank: c.int(1), flagged_cheat: c.bool(true) }, as: "e1" }),
        s.db.add({ table: entry, row: { leaderboard_id: ref("lb1.id"), player_handle: c.text("Solar"), score: c.int(8123), rank: c.int(2), flagged_cheat: c.bool(false) }, as: "e2" }),
        s.db.add({ table: entry, row: { leaderboard_id: ref("lb1.id"), player_handle: c.text("Rook"), score: c.int(7788), rank: c.int(3), flagged_cheat: c.bool(false) }, as: "e3" }),
        s.db.add({ table: entry, row: { leaderboard_id: ref("lb1.id"), player_handle: c.text("Vext"), score: c.int(7020), rank: c.int(4), flagged_cheat: c.bool(false) }, as: "e4" }),
        s.db.add({ table: entry, row: { leaderboard_id: ref("lb2.id"), player_handle: c.text("Team Aegis"), score: c.int(5400), rank: c.int(1), flagged_cheat: c.bool(false) }, as: "e5" }),
        s.db.add({ table: entry, row: { leaderboard_id: ref("lb2.id"), player_handle: c.text("Team Vanta"), score: c.int(5210), rank: c.int(2), flagged_cheat: c.bool(false) }, as: "e6" }),
        s.db.add({ table: entry, row: { leaderboard_id: ref("lb2.id"), player_handle: c.text("Team Cinder"), score: c.int(4990), rank: c.int(3), flagged_cheat: c.bool(false) }, as: "e7" }),
        // In-flight actions so the queue and trail are populated on arrival.
        s.db.add({
          table: ops_action,
          row: {
            type: "wipe_entry", entry_id: ref("e1.id"), leaderboard_id: ref("lb1.id"),
            payload_json: c.obj({ reason: "suspected aimbot", evidence: "replay-4821" }),
            requested_by: ref("op_priya.id"), status: "pending",
            reason: c.text("Flagged for cheating. Remove from the Ranked Ladder."),
            sensitive: c.bool(true), min_approver_role: "lead", rule_version: c.text("v1"),
          },
          as: "a1",
        }),
        s.db.add({
          table: ops_action,
          row: {
            type: "reset_leaderboard", leaderboard_id: ref("lb2.id"),
            payload_json: c.obj({ scope: "full", reason: "corrupted season rollover" }),
            requested_by: ref("op_marco.id"), status: "pending",
            reason: c.text("Season data corrupted. Reset the board."),
            sensitive: c.bool(true), min_approver_role: "admin", rule_version: c.text("v1"),
          },
          as: "a2",
        }),
        s.db.add({
          table: ops_action,
          row: {
            type: "grant_reward", entry_id: ref("e2.id"), leaderboard_id: ref("lb1.id"),
            payload_json: c.obj({ reward: "Season 7 Finalist badge", amount: 1 }),
            requested_by: ref("op_priya.id"), status: "pending",
            reason: c.text("Top finish reward for Solar."),
            sensitive: c.bool(false), min_approver_role: "lead", rule_version: c.text("v1"),
          },
          as: "a3",
        }),
        // Seed the trail: a request row per action, plus a pre-recorded guard denial.
        s.function.run({ fn: writeAudit, input: { actor_id: ref("op_priya.id"), action: c.text("action.requested"), ops_action_id: ref("a1.id"), detail_json: obj({ type: c.text("wipe_entry"), sensitive: c.bool(true) }), rule_version: c.text("v1") } }),
        s.function.run({ fn: writeAudit, input: { actor_id: ref("op_marco.id"), action: c.text("action.requested"), ops_action_id: ref("a2.id"), detail_json: obj({ type: c.text("reset_leaderboard"), sensitive: c.bool(true) }), rule_version: c.text("v1") } }),
        s.function.run({ fn: writeAudit, input: { actor_id: ref("op_priya.id"), action: c.text("action.requested"), ops_action_id: ref("a3.id"), detail_json: obj({ type: c.text("grant_reward"), sensitive: c.bool(false) }), rule_version: c.text("v1") } }),
        s.function.run({ fn: writeAudit, input: { actor_id: ref("op_priya.id"), action: c.text("guard.denied"), ops_action_id: ref("a1.id"), detail_json: obj({ guard: c.text("segregation_of_duties"), note: c.text("requester tried to approve her own request") }), rule_version: c.text("v1") } }),
        s.update_var("did_seed", c.bool(true)),
      ],
    }),
  ],
  response: obj({
    seeded: ref("did_seed"),
    operators: c.int(3),
    leaderboards: c.int(2),
    entries: c.int(7),
    pending_actions: c.int(3),
  }),
});
