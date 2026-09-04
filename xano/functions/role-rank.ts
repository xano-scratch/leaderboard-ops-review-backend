import { defineFunction, input, inp, ref, s, c } from "@xanots/sdk";

/** The single place the ops < lead < admin ordering lives. Returns a numeric rank. */
export const roleRank = defineFunction({
  name: "role_rank",
  input: { role: input.text({ required: true }) },
  stack: [
    s.set_var("rank", c.int(0)),
    s.switch({
      on: inp("role"),
      cases: [
        { when: c.text("ops"), body: [s.update_var("rank", c.int(1))], break: true },
        { when: c.text("lead"), body: [s.update_var("rank", c.int(2))], break: true },
        { when: c.text("admin"), body: [s.update_var("rank", c.int(3))], break: true },
      ],
    }),
  ],
  response: { rank: ref("rank") },
});
