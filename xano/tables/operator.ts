import { table, f } from "@xanots/sdk";

/**
 * The auth table. Every operator signs in against this table, and every
 * protected endpoint reads the caller from it. `role` drives every guard:
 * ops < lead < admin. Access control is API-layer (this table + per-endpoint
 * role preconditions), never row-level security.
 */
export const operator = table({
  name: "operator",
  auth: true,
  schema: {
    email: f.email({ required: true }),
    // Hashed on write. Read it back only by naming it in a db.get `output`.
    password: f.password({ required: true }),
    name: f.text({ required: true }),
    role: f.enum(["ops", "lead", "admin"], { required: true }),
    active: f.bool({ default: true }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
});
