import { apiGroup } from "@xanots/sdk";

// One API group per surface. The `canonical` slug is the public URL token and
// is pinned so getPath() resolves in the browser bundle without a lock file.
// A canonical is unique across the whole Xano instance, so each is prefixed
// `lorb_` (leaderboard-ops-review-backend) to avoid colliding with other apps.
export const authGroup = apiGroup({ name: "auth", canonical: "lorb_auth" });
export const opsGroup = apiGroup({ name: "ops", canonical: "lorb_ops" });
export const boardsGroup = apiGroup({ name: "boards", canonical: "lorb_boards" });
export const auditGroup = apiGroup({ name: "audit", canonical: "lorb_audit" });
export const seedGroup = apiGroup({ name: "seed", canonical: "lorb_seed" });
