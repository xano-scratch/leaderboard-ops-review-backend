import { workspace } from "@xanots/sdk";

import { operator } from "./tables/operator.js";
import { leaderboard } from "./tables/leaderboard.js";
import { entry } from "./tables/entry.js";
import { ops_action } from "./tables/ops_action.js";
import { approval } from "./tables/approval.js";
import { audit_log } from "./tables/audit_log.js";
import { rule_config } from "./tables/rule_config.js";

import { roleRank } from "./functions/role_rank.js";
import { resolveRule } from "./functions/resolve_rule.js";
import { writeAudit } from "./functions/write_audit.js";

import { authGroup, opsGroup, boardsGroup, auditGroup, seedGroup } from "./api/groups.js";

import { loginQuery } from "./api/auth_login.js";
import { meQuery } from "./api/auth_me.js";
import { actionRequestQuery } from "./api/ops_action_request.js";
import { actionsQueueQuery } from "./api/ops_actions_queue.js";
import { actionDetailQuery } from "./api/ops_action_detail.js";
import { actionApproveQuery } from "./api/ops_action_approve.js";
import { actionExecuteQuery } from "./api/ops_action_execute.js";
import { leaderboardsListQuery } from "./api/boards_leaderboards_list.js";
import { entriesListQuery } from "./api/boards_entries_list.js";
import { auditQuery } from "./api/audit_query.js";
import { seedRunQuery } from "./api/seed_run.js";

/**
 * leaderboard-ops-review-backend
 *
 * The governed API layer under a game studio's leaderboard ops tool. Access is
 * routed by role, sensitive actions are held for a distinct second approver
 * (segregation of duties), and every attempt lands in an append-only audit
 * trail stamped with the rule version. Auth is API-layer RBAC (an auth table
 * plus per-endpoint role preconditions), never row-level security.
 */
export default workspace("leaderboard-ops-review-backend")
  .registerTables([operator, leaderboard, entry, ops_action, approval, audit_log, rule_config])
  .registerFunctions([roleRank, resolveRule, writeAudit])
  .registerApiGroups([authGroup, opsGroup, boardsGroup, auditGroup, seedGroup])
  .registerQueries([
    loginQuery,
    meQuery,
    actionRequestQuery,
    actionsQueueQuery,
    actionDetailQuery,
    actionApproveQuery,
    actionExecuteQuery,
    leaderboardsListQuery,
    entriesListQuery,
    auditQuery,
    seedRunQuery,
  ]);
