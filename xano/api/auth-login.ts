import { query, input, inp, ref, expr, obj, s, c } from "@xanots/sdk";
import { authApi } from "./groups.js";
import { operator } from "../tables/operator.js";

/** Public login: verify the operator and mint an auth token. */
export const loginQuery = query({
  name: "login",
  verb: "POST",
  apiGroup: authApi,
  auth: false,
  input: {
    email: input.email({ required: true, methods: ["lower", "trim"] }),
    // Plaintext on login — an f.password column double-hashes if taken via input.password.
    password: input.text({ required: true }),
  },
  stack: [
    s.db.get({
      table: operator,
      fieldName: "email",
      fieldValue: inp("email"),
      // `password` is access:"internal" — name it in output to read the hash.
      output: ["id", "email", "name", "role", "active", "password"],
      as: "u",
    }),
    s.precondition({
      expr: expr(ref("u", { safe: true }), "!=", c.null()),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.check_password({ text_password: inp("password"), hash_password: ref("u.password"), as: "ok" }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.create_auth_token({ table: operator, id: ref("u.id"), as: "token" }),
  ],
  response: {
    authToken: ref("token"),
    operator: obj({ id: ref("u.id"), name: ref("u.name"), email: ref("u.email"), role: ref("u.role") }),
  },
});
