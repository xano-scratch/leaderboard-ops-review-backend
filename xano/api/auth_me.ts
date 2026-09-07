import { query, s, ref, auth, obj } from "@xanots/sdk";
import { authGroup } from "./groups.js";
import { operator } from "../tables/operator.js";

/**
 * The current operator (id, name, role). Feeds the frontend's role gating so
 * the UI can hide actions a role may not take, while the API layer stays the
 * real enforcement point.
 */
export const meQuery = query({
  name: "me",
  verb: "GET",
  apiGroup: authGroup,
  auth: operator,
  stack: [
    s.db.get({
      table: operator,
      fieldValue: auth("id"),
      output: ["id", "email", "name", "role", "active"],
      as: "u",
    }),
  ],
  response: obj({
    id: ref("u.id"),
    name: ref("u.name"),
    role: ref("u.role"),
    email: ref("u.email"),
    active: ref("u.active"),
  }),
});
