import { table, f } from "@xanots/sdk";

/**
 * Operators who use the ops tool. This is the auth table: a login mints a token
 * bound to a row here, and `role` drives every server-side guard.
 */
export const operator = table({
  name: "operator",
  auth: true,
  // `id` (int PK) + `created_at` (epochms) are auto-injected.
  schema: {
    email: f.email({ required: true, methods: ["lower", "trim"] }),
    password: f.password({ required: true }),
    name: f.text({ required: true }),
    role: f.enum(["ops", "lead", "admin"], { required: true, default: "ops" }),
    active: f.bool({ default: true }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
});
