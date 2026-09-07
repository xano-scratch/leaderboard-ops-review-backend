# XanoScript rendering (generated)

**Do not edit these files.** They are rendered from the TypeScript workspace `xano/index.ts` by `xanots export --xanoscript`, and the whole directory is replaced on every run.
Edit the TypeScript under `xano/` and regenerate with `npm run xano:export`; anything changed here is overwritten by the next run.

## Why it is committed

A change to the backend shows up in review as the XanoScript it produces, one file per
object, beside the code that produced it. Read the diff here to see what the engine will
run; ask for changes in the source.

`npm run xano:check` fails when the committed copy is stale, so a change cannot ship with a tree that disagrees with its source.

## Reading the tree

| Path | What it is |
|---|---|
| `workspace/<name>.xs` | the workspace settings; `workspace/trigger/` its triggers |
| `table/<name>.xs` | a table; `table/trigger/` its triggers |
| `api/<group>/<group>.xs` | an API group; `api/<group>/<path>/<name>_<VERB>.xs` each of its endpoints |
| `function/`, `task/`, `addon/`, `middleware/` | one file per object |
| `ai/agent/`, `ai/mcp_server/`, `ai/tool/` | agents, MCP servers and tools; a `trigger/` folder beneath each |
| `realtime/server/<server>/channel/<channel>/message/` | realtime servers, their channels, their messages, with triggers beneath each |
| `workflow_test/`, `microservice/` | one file per object |

Names are snake_cased (`get-user` becomes `get_user.xs`); a path parameter such as `{id}` becomes a
directory segment. This is the layout the Xano CLI writes on `pull`, so the tree can be
pushed to an environment as it is (`xano ephemeral push <env> --directory xanoscript`) and
pulls back byte for byte.

A `guid = "..."` line is the object's identity, pinned by the workspace's `xano.lock`; it is what
keeps a rename a rename on the engine. A `placeholder "<name>"` line marks a statement the
engine's XanoScript cannot express; the export warns about each one.

Generated with @xanots/sdk 0.0.21.
