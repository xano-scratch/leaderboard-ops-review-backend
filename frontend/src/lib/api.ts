// The one contract: every request path and every request/response *type* is
// derived from the xanots query defs. Change a def and the client follows — no
// hand-typed URLs, no hand-mirrored response shapes.
import type { InferInput, InferResponse } from "@xanots/sdk";

// Lean def imports — each read only for its getPath()/verb. None builds a heavy
// graph (no agents), so importing them is cheap.
import { loginQuery } from "../../../xano/api/auth-login.js";
import { meQuery } from "../../../xano/api/auth-me.js";
import { actionRequestQuery } from "../../../xano/api/ops-action-request.js";
import { actionsQueueQuery } from "../../../xano/api/ops-actions-queue.js";
import { actionDetailQuery } from "../../../xano/api/ops-action-detail.js";
import { actionApproveQuery } from "../../../xano/api/ops-action-approve.js";
import { actionExecuteQuery } from "../../../xano/api/ops-action-execute.js";
import { leaderboardsListQuery } from "../../../xano/api/boards-leaderboards-list.js";
import { entriesListQuery } from "../../../xano/api/boards-entries-list.js";
import { auditQueryQuery } from "../../../xano/api/audit-query.js";
import { seedRunQuery } from "../../../xano/api/seed-run.js";

/**
 * The deployed Xano backend's base URL. Injected as `window.XANO_HOST` by
 * `xanots deploy <entry> --static <dir>`, or read from `VITE_XANO_HOST` in dev.
 */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

const TOKEN_KEY = "lorb_token";
let authToken: string | null = null;

export function setAuthToken(t: string | null): void {
  authToken = t;
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* localStorage may be unavailable; the in-memory token still works. */
  }
}
export function loadAuthToken(): string | null {
  try {
    authToken = localStorage.getItem(TOKEN_KEY);
  } catch {
    authToken = null;
  }
  return authToken;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// A loose structural view of a query def — enough to read its path + verb.
// `any[]` (not `unknown[]`) so every def's typed getPath signature is assignable.
type AnyDef = { getPath: (...args: any[]) => string; verb: string };

/**
 * Call an endpoint from its def. `pathKeys` names inputs that belong in the URL
 * PATH (bound via getPath({ params })) rather than the query string / body — the
 * by-id detail GET is the one endpoint that uses it.
 */
async function call<TRes>(
  def: AnyDef,
  input?: Record<string, unknown>,
  pathKeys?: readonly string[],
): Promise<TRes> {
  const params: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  if (input) {
    for (const [k, v] of Object.entries(input)) {
      if (pathKeys && pathKeys.includes(k)) params[k] = v;
      else rest[k] = v;
    }
  }
  const path = pathKeys && pathKeys.length ? def.getPath({ params }) : def.getPath();
  let url = XANO_HOST + path;

  const isGet = def.verb === "GET" || def.verb === "HEAD";
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const init: RequestInit = { method: def.verb, headers };

  if (isGet) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined && v !== null && v !== "") sp.append(k, String(v));
    }
    const qs = sp.toString();
    if (qs) url += `?${qs}`;
  } else {
    init.body = JSON.stringify(rest);
  }

  const res = await fetch(url, init);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "message" in data && String((data as { message: unknown }).message)) ||
      res.statusText ||
      `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }
  return data as TRes;
}

// ── Typed request/response shapes, inferred from the defs ────────────────────
export type LoginInput = InferInput<typeof loginQuery>;
export type LoginResponse = InferResponse<typeof loginQuery>;
// A `single` db.get types as Row | null; the auth guard guarantees the row, so
// the client surface exposes the non-null shape.
export type Me = NonNullable<InferResponse<typeof meQuery>>;
export type ActionRequestInput = InferInput<typeof actionRequestQuery>;
export type ActionRequestResponse = InferResponse<typeof actionRequestQuery>;
export type QueueResponse = InferResponse<typeof actionsQueueQuery>;
export type OpsAction = QueueResponse["actions"][number];
export type OperatorSummary = QueueResponse["operators"][number];
export type DetailResponse = InferResponse<typeof actionDetailQuery>;
export type ApproveInput = InferInput<typeof actionApproveQuery>;
export type ApproveResponse = InferResponse<typeof actionApproveQuery>;
export type ExecuteResponse = InferResponse<typeof actionExecuteQuery>;
export type BoardsResponse = InferResponse<typeof leaderboardsListQuery>;
export type Board = BoardsResponse["boards"][number];
export type EntriesResponse = InferResponse<typeof entriesListQuery>;
export type Entry = EntriesResponse["entries"][number];
export type AuditResponse = InferResponse<typeof auditQueryQuery>;
export type AuditRow = AuditResponse["rows"][number];

// ── The client surface ───────────────────────────────────────────────────────
export const api = {
  seed: (force = false) => call<InferResponse<typeof seedRunQuery>>(seedRunQuery, { force }),
  login: (i: LoginInput) => call<LoginResponse>(loginQuery, i as Record<string, unknown>),
  me: () => call<Me>(meQuery),
  requestAction: (i: ActionRequestInput) =>
    call<ActionRequestResponse>(actionRequestQuery, i as Record<string, unknown>),
  queue: (status?: string) => call<QueueResponse>(actionsQueueQuery, status ? { status } : undefined),
  detail: (ops_action_id: number) =>
    call<DetailResponse>(actionDetailQuery, { ops_action_id }, ["ops_action_id"]),
  approve: (i: ApproveInput) => call<ApproveResponse>(actionApproveQuery, i as Record<string, unknown>),
  execute: (ops_action_id: number) => call<ExecuteResponse>(actionExecuteQuery, { ops_action_id }),
  boards: () => call<BoardsResponse>(leaderboardsListQuery),
  entries: (leaderboard_id: number) => call<EntriesResponse>(entriesListQuery, { leaderboard_id }),
  audit: (filters?: { actor_id?: number; ops_action_id?: number; action?: string }) =>
    call<AuditResponse>(auditQueryQuery, filters as Record<string, unknown> | undefined),
};
