import { apiGroup } from "@xanots/sdk";

// Canonicals are pinned (so public paths are stable and getPath() resolves in the
// browser bundle) and app-namespaced so they stay unique on the shared instance.
export const authApi = apiGroup({ name: "auth", canonical: "lorb_auth" });
export const opsApi = apiGroup({ name: "ops", canonical: "lorb_ops" });
export const boardsApi = apiGroup({ name: "boards", canonical: "lorb_boards" });
export const auditApi = apiGroup({ name: "audit", canonical: "lorb_audit" });
export const seedApi = apiGroup({ name: "seed", canonical: "lorb_seed" });
