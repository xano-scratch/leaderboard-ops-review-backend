import { defineFunction, input, s, c, ref, inp, expr } from "@xanots/sdk";

/**
 * The single place the role ordering lives: ops(1) < lead(2) < admin(3).
 * Role guards compare the caller's rank against the required rank, so the
 * ordering is defined once and reused, not re-spelled per endpoint.
 */
export const roleRank = defineFunction({
  name: "lorb_role_rank",
  description: "Map an operator role to its numeric rank (ops=1, lead=2, admin=3).",
  input: { role: input.text({ required: true }) },
  stack: [
    s.set_var("rank", c.int(0)),
    s.conditional({
      when: expr(inp("role"), "=", c.text("admin")),
      then: [s.update_var("rank", c.int(3))],
      elif: [
        { when: expr(inp("role"), "=", c.text("lead")), then: [s.update_var("rank", c.int(2))] },
        { when: expr(inp("role"), "=", c.text("ops")), then: [s.update_var("rank", c.int(1))] },
      ],
    }),
  ],
  response: { rank: ref("rank") },
});
