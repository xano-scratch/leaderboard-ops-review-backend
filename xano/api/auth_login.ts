import { query, input, s, c, ref, inp, expr, obj } from "@xanots/sdk";
import { authGroup } from "./groups.js";
import { operator } from "../tables/operator.js";

/**
 * Sign in an operator and mint a bearer token. The password is taken as
 * input.text (NOT input.password, which would double-hash and never match),
 * and the stored hash is pulled by naming `password` in the db.get output.
 */
export const loginQuery = query({
  name: "login",
  verb: "POST",
  apiGroup: authGroup,
  input: {
    email: input.email({ required: true, methods: ["lower", "trim"] }),
    password: input.text({ required: true }),
  },
  stack: [
    s.db.get({
      table: operator,
      fieldName: "email",
      fieldValue: inp("email"),
      output: ["id", "email", "name", "role", "active", "password"],
      as: "u",
    }),
    s.precondition({
      expr: expr(ref("u", { safe: true }), "!=", c.null()),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.precondition({
      expr: expr(ref("u.active"), "=", c.bool(true)),
      error_type: "accessdenied",
      error: c.text("This operator account is deactivated."),
    }),
    s.security.check_password({
      text_password: inp("password"),
      hash_password: ref("u.password"),
      as: "ok",
    }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.create_auth_token({ table: operator, id: ref("u.id"), as: "token" }),
  ],
  response: {
    token: ref("token"),
    operator: obj({ id: ref("u.id"), name: ref("u.name"), role: ref("u.role"), email: ref("u.email") }),
  },
});
