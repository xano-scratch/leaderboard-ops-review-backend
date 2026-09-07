# Leaderboard Ops Review Backend

The governed backend under an AI-built game studio ops tool. Every leaderboard action is routed by role, sensitive ones wait for a distinct second approver, and each attempt is written to an append-only audit trail. It all lives in one Xano API layer the frontend cannot bypass.

![The review queue: a sensitive wipe selected, its rule and rule version, and the per-action audit trail with a guard denial](docs/screenshot.png)

**7 tables · 11 APIs · 3 functions** · Play 3 (Pilot to Production) · competitive gaming platform

## What it demonstrates

A frontend builder like Bolt or Lovable can put a working ops tool in front of staff in a day. The open question is what that tool is allowed to do. This backend holds the rules the generated frontend cannot skip:

- **Access is routed by role.** An ops operator can request an action. Only a lead or an admin can approve one, and only for the action types their role covers.
- **Sensitive actions need a second person.** A board reset or an entry wipe waits for an approval from a different operator than the one who asked. That is segregation of duties.
- **Every attempt is on the record.** Requests, denials, approvals, and executions all land in an append-only audit trail, each stamped with the rule version that applied.

The point for a technical evaluator: a plausible AI-built internal tool becomes safe to run because the controls live in the API layer, not in the frontend. Access control is API-layer middleware plus role checks (an auth table, a bearer token, a role precondition per endpoint). There is no row-level security anywhere.

## The governed flow

1. **Request.** An operator asks for an action (reset a board, wipe an entry, grant a reward). The backend resolves the action's sensitivity and its minimum approver role from the active rule set, records it as `pending`, and audits the request.
2. **Review.** A reviewer approves or rejects it. Two guards run at the API layer: the reviewer's role must meet the minimum for the type, and the reviewer cannot be the requester. A blocked attempt is written to the trail before it is refused, so the denial survives.
3. **Execute.** An approved action runs only if a distinct operator signed off. The effect is applied to game state (entries cleared, an entry removed, a reward recorded), and the execution is audited.

## Repo layout

```
xano/
  tables/       operator (auth), leaderboard, entry, ops_action, approval, audit_log, rule_config
  functions/    role_rank, resolve_rule, write_audit   (the shared governed logic)
  api/          the API groups and endpoints (verb, path, typed input, stack)
  index.ts      the workspace, registering everything
  xano.lock     pinned object identity and public URLs (committed)
xanoscript/     the backend rendered as XanoScript, one file per object (committed)
frontend/       React, Vite, Tailwind, shadcn; src/lib/api.ts is the one contract
docs/           this project's landing page and the screenshot
```

## API surface

| Method and path | What it enforces |
| --- | --- |
| `POST /api:lorb_auth/login` | Issues a bearer token for an operator (native auth table). |
| `GET /api:lorb_auth/me` | The current operator and role, for the frontend's gating. |
| `POST /api:lorb_ops/action_request` | Validates the target, resolves sensitivity and min role from the rule set, records `pending`, audits it. |
| `GET /api:lorb_ops/actions_queue` | The review queue, joined to requester and target, filterable by status. |
| `GET /api:lorb_ops/action_detail/{ops_action_id}` | One action with its requester, target, and approval rows. |
| `POST /api:lorb_ops/action_approve` | Role guard and segregation of duties. A denial is audited, then refused. |
| `POST /api:lorb_ops/action_execute` | Runs only if `approved` by a distinct operator. Applies the effect and audits it. |
| `GET /api:lorb_boards/leaderboards_list` | Boards with status and entry count. |
| `GET /api:lorb_boards/entries_list` | Ranked entries for a board, showing the cheat flag. |
| `GET /api:lorb_audit/audit_query` | The audit trail, filterable, every row stamped with a rule version. |
| `POST /api:lorb_seed/seed_run` | Idempotent demo data (pass `force` to reset). |

## Quick start

```bash
git clone https://github.com/xano-scratch/leaderboard-ops-review-backend
cd leaderboard-ops-review-backend
npm install
npx xanots login        # authenticate once against your Xano account
npm run xano:deploy     # build the frontend, deploy it with the backend, print the live URL
```

The deploy self-seeds nothing, so seed the demo once from the running app (the **Reset demo** button) or with a `POST` to `/api:lorb_seed/seed_run`. Then sign in with a demo operator:

| Operator | Email | Role |
| --- | --- | --- |
| Priya Rao | `priya@studio.games` | ops |
| Marco Diaz | `marco@studio.games` | lead |
| Dana Kim | `dana@studio.games` | admin |

The demo password is `password123`. Try approving a sensitive action as the operator who requested it, or as an ops operator, and watch the API refuse it and record the denial.

## FAQ

**Is access control row-level?** No. Every check is at the API layer: an auth table, a bearer token, and a role precondition on each endpoint. That is how authorization works in Xano.

**What makes an action sensitive?** The active `rule_config` row. It lists which action types need a distinct second approver and the minimum role for each. Every decision stamps the version it applied, so the trail is reproducible even after the rules change.

**Can a reviewer approve their own request?** No. The approve endpoint refuses it under the segregation-of-duties guard and writes the denial to the audit trail.

**Does it need external services or credentials?** No. It runs on seed data with native Xano auth. There are no extra packages and no external connections.

**Is this a production system?** No. It is a scratch template that shows the pattern. Deploy it to your own Xano workspace to build on it.
