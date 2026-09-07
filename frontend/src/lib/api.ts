// The one contract. Every path, request type, and response type below is
// derived from the xanots query defs — never hand-typed. Change a def and this
// file (and the screens that use it) follow. The only cast is at the fetch
// boundary, where res.json() is unavoidably `any`.

import type { InferInput, InferResponse } from "@xanots/sdk";

// Import the lean query defs for their getPath()/verb. None of these build a
// heavy graph (no agents), so importing them is the ~267 kB SDK runtime floor
// plus a little per def — the cost the "one contract" is worth.
import { loginQuery } from "../../../xano/api/auth_login.js";
import { meQuery } from "../../../xano/api/auth_me.js";
import { actionRequestQuery } from "../../../xano/api/ops_action_request.js";
import { actionsQueueQuery } from "../../../xano/api/ops_actions_queue.js";
import { actionDetailQuery } from "../../../xano/api/ops_action_detail.js";
import { actionApproveQuery } from "../../../xano/api/ops_action_approve.js";
import { actionExecuteQuery } from "../../../xano/api/ops_action_execute.js";
import { leaderboardsListQuery } from "../../../xano/api/boards_leaderboards_list.js";
import { entriesListQuery } from "../../../xano/api/boards_entries_list.js";
import { auditQuery } from "../../../xano/api/audit_query.js";
import { seedRunQuery } from "../../../xano/api/seed_run.js";

/** The deployed backend base URL: injected by `deploy --static`, or VITE_XANO_HOST in dev. */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

// ---- Types derived from the defs (the one contract) ------------------------
export type LoginInput = InferInput<typeof loginQuery>;
export type LoginResponse = InferResponse<typeof loginQuery>;
export type Operator = LoginResponse["operator"];
export type Me = InferResponse<typeof meQuery>;
export type Leaderboard = InferResponse<typeof leaderboardsListQuery>[number];
export type Entry = InferResponse<typeof entriesListQuery>[number];
export type QueueItem = InferResponse<typeof actionsQueueQuery>[number];
export type ActionDetail = InferResponse<typeof actionDetailQuery>;
export type OpsAction = InferResponse<typeof actionRequestQuery>;
export type AuditRow = InferResponse<typeof auditQuery>[number];
export type RequestInput = InferInput<typeof actionRequestQuery>;
export type ApproveInput = InferInput<typeof actionApproveQuery>;
export type ActionType = RequestInput["type"];
export type Role = "ops" | "lead" | "admin";

export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
  }
}

// ---- Session (a bearer token + the signed-in operator) ---------------------
const TOKEN_KEY = "lorb_token";
const OP_KEY = "lorb_operator";

export function getToken(): string {
  return (typeof localStorage !== "undefined" && localStorage.getItem(TOKEN_KEY)) || "";
}
export function getOperator(): Operator | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(OP_KEY);
  return raw ? (JSON.parse(raw) as Operator) : null;
}
export function setSession(token: string, operator: Operator) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(OP_KEY, JSON.stringify(operator));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(OP_KEY);
}

// ---- The typed fetch layer -------------------------------------------------
// getPath has per-def overloads (some require path params); accept any shape at
// this fetch-layer boundary. The public wrappers below keep full input types.
type Def = { verb: string; getPath: (opts?: any) => string };
type CallOpts = {
  params?: Record<string, unknown>;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
};

async function call(def: Def, opts: CallOpts = {}): Promise<unknown> {
  const path = opts.params ? def.getPath({ params: opts.params }) : def.getPath();
  const url = new URL(XANO_HOST + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== "" && !(typeof v === "number" && v === 0)) {
        url.searchParams.set(k, String(v));
      }
    }
  }
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(url.toString(), {
    method: def.verb,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      detail = (JSON.parse(text) as { message?: string }).message ?? text;
    } catch {
      /* keep raw text */
    }
    throw new ApiError(res.status, detail);
  }
  return text ? JSON.parse(text) : null;
}

export const api = {
  login: (body: LoginInput) => call(loginQuery, { body }) as Promise<LoginResponse>,
  me: () => call(meQuery) as Promise<Me>,
  leaderboards: () => call(leaderboardsListQuery) as Promise<Leaderboard[]>,
  entries: (leaderboard_id: number) =>
    call(entriesListQuery, { query: { leaderboard_id } }) as Promise<Entry[]>,
  queue: (status?: string) =>
    call(actionsQueueQuery, { query: { status: status ?? "" } }) as Promise<QueueItem[]>,
  detail: (ops_action_id: number) =>
    call(actionDetailQuery, { params: { ops_action_id } }) as Promise<ActionDetail>,
  request: (body: RequestInput) => call(actionRequestQuery, { body }) as Promise<OpsAction>,
  approve: (body: ApproveInput) =>
    call(actionApproveQuery, { body }) as Promise<InferResponse<typeof actionApproveQuery>>,
  execute: (ops_action_id: number) =>
    call(actionExecuteQuery, { body: { ops_action_id } }) as Promise<OpsAction>,
  audit: (filter: { actor_id?: number; ops_action_id?: number; action?: string } = {}) =>
    call(auditQuery, { query: filter }) as Promise<AuditRow[]>,
  seed: (force = false) => call(seedRunQuery, { body: { force } }) as Promise<unknown>,
};
