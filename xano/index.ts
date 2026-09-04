import { workspace } from "@xanots/sdk";

// Tables
import { operator } from "./tables/operator.js";
import { leaderboard } from "./tables/leaderboard.js";
import { entry } from "./tables/entry.js";
import { opsAction } from "./tables/ops-action.js";
import { approval } from "./tables/approval.js";
import { auditLog } from "./tables/audit-log.js";
import { ruleConfig } from "./tables/rule-config.js";

// API groups
import { authApi, opsApi, boardsApi, auditApi, seedApi } from "./api/groups.js";

// Shared functions
import { roleRank } from "./functions/role-rank.js";
import { resolveRule } from "./functions/resolve-rule.js";
import { writeAudit } from "./functions/write-audit.js";

// Endpoints
import { loginQuery } from "./api/auth-login.js";
import { meQuery } from "./api/auth-me.js";
import { actionRequestQuery } from "./api/ops-action-request.js";
import { actionsQueueQuery } from "./api/ops-actions-queue.js";
import { actionDetailQuery } from "./api/ops-action-detail.js";
import { actionApproveQuery } from "./api/ops-action-approve.js";
import { actionExecuteQuery } from "./api/ops-action-execute.js";
import { leaderboardsListQuery } from "./api/boards-leaderboards-list.js";
import { entriesListQuery } from "./api/boards-entries-list.js";
import { auditQueryQuery } from "./api/audit-query.js";
import { seedRunQuery } from "./api/seed-run.js";

/**
 * Leaderboard Ops Review Backend — the governed API layer under an AI-built
 * game-studio ops tool. Every sensitive leaderboard action is role-routed, held
 * for a distinct second approver, and written to an append-only audit trail that
 * the frontend cannot bypass. Access control is API-layer RBAC, never RLS.
 */
export default workspace("leaderboard-ops-review-backend")
  .registerTables([operator, leaderboard, entry, opsAction, approval, auditLog, ruleConfig])
  .registerApiGroups([authApi, opsApi, boardsApi, auditApi, seedApi])
  .registerFunctions([roleRank, resolveRule, writeAudit])
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
    auditQueryQuery,
    seedRunQuery,
  ]);
