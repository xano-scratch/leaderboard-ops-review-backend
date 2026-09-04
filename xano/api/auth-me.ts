import { query, auth, ref, s } from "@xanots/sdk";
import { authApi } from "./groups.js";
import { operator } from "../tables/operator.js";

/** The current operator (id, name, role) — feeds the frontend role gating. */
export const meQuery = query({
  name: "me",
  verb: "GET",
  apiGroup: authApi,
  auth: operator,
  stack: [s.db.get({ table: operator, fieldValue: auth("id"), output: ["id", "name", "email", "role"], as: "me" })],
  response: ref("me"),
});
